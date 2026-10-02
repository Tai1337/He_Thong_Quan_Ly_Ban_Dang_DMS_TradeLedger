import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InventoryCountRepository } from './inventory-count.repository';
import { CreateInventoryCountDto } from './dto/create-inventory-count.dto';
import { UpdateCountItemsDto } from './dto/update-count-items.dto';
import { QueryCountDto } from './dto/query-count.dto';
import { CountType, DocStatus } from '@prisma/client';
import * as ExcelJS from 'exceljs';

@Injectable()
export class InventoryCountService {
  constructor(private readonly countRepo: InventoryCountRepository) {}

  /**
   * Danh sách phiếu kiểm kê
   */
  async getCounts(distributorId: string | number, query: QueryCountDto) {
    return this.countRepo.findCountsByDistributor(distributorId, query);
  }

  /**
   * Chi tiết phiếu kiểm kê
   */
  async getCountById(id: string | number, distributorId: string | number) {
    const count = await this.countRepo.findCountById(id, distributorId);
    if (!count) {
      throw new NotFoundException('Không tìm thấy phiếu kiểm kê');
    }
    return count;
  }

  /**
   * Tạo mới phiếu kiểm kê
   */
  async createCount(distributorId: string | number, dto: CreateInventoryCountDto) {
    if (!dto.warehouseId) {
      throw new BadRequestException('Vui lòng chọn kho hàng cần kiểm kê');
    }

    const countCode = await this.countRepo.generateCountCode();
    const countType = dto.countType === 'BY_SKU' ? CountType.BY_SKU : CountType.MONTHLY;

    let itemsToCreate: Array<{
      lotId: bigint;
      systemQuantity: number;
      actualQuantity?: number | null;
      variance?: number | null;
      reason?: string | null;
    }> = [];

    // Nếu kiểm kê định kỳ (MONTHLY) hoặc không truyền mảng items: tự động load toàn bộ tồn kho của kho
    if (countType === CountType.MONTHLY || !dto.items || dto.items.length === 0) {
      const stockLots = await this.countRepo.getWarehouseStockLots(distributorId, dto.warehouseId);
      
      itemsToCreate = stockLots.map((lot) => {
        const sysQty = lot.stockBalance ? Number(lot.stockBalance.quantityOnHand) : 0;
        return {
          lotId: lot.id,
          systemQuantity: sysQty,
          actualQuantity: null,
          variance: null,
          reason: null,
        };
      });
    } else {
      // Kiểm kê theo SKU/Lô được chọn trước
      const lotIds = dto.items.map((i) => BigInt(i.lotId));
      const stockLots = await this.countRepo.getWarehouseStockLots(distributorId, dto.warehouseId);
      const stockMap = new Map(stockLots.map((l) => [l.id.toString(), l]));

      for (const itemDto of dto.items) {
        const lot = stockMap.get(itemDto.lotId.toString());
        if (lot) {
          const sysQty = lot.stockBalance ? Number(lot.stockBalance.quantityOnHand) : 0;
          const actQty = itemDto.actualQuantity !== undefined && itemDto.actualQuantity !== null
            ? Number(itemDto.actualQuantity)
            : null;
          const variance = actQty !== null ? actQty - sysQty : null;

          itemsToCreate.push({
            lotId: lot.id,
            systemQuantity: sysQty,
            actualQuantity: actQty,
            variance,
            reason: itemDto.reason || null,
          });
        }
      }
    }

    if (itemsToCreate.length === 0) {
      throw new BadRequestException('Kho hàng đã chọn hiện không có mặt hàng hoặc lô hàng nào để kiểm kê');
    }

    return this.countRepo.createCount({
      countCode,
      distributorId: BigInt(distributorId),
      warehouseId: BigInt(dto.warehouseId),
      countType,
      notes: dto.notes,
      createdById: dto.createdById ? BigInt(dto.createdById) : undefined,
      items: itemsToCreate,
    });
  }

  /**
   * Cập nhật số lượng đếm thực tế và lý do giải trình
   */
  async updateCountItems(id: string | number, distributorId: string | number, dto: UpdateCountItemsDto) {
    return this.countRepo.updateCountItems(id, distributorId, dto.items, dto.notes);
  }

  /**
   * Gửi duyệt phiếu kiểm kê
   */
  async submitCount(id: string | number, distributorId: string | number) {
    const count = await this.countRepo.findCountById(id, distributorId);
    if (!count) {
      throw new NotFoundException('Không tìm thấy phiếu kiểm kê');
    }

    if (count.status !== DocStatus.DRAFT) {
      throw new BadRequestException('Chỉ phiếu ở trạng thái Nháp (DRAFT) mới có thể gửi duyệt');
    }

    // Kiểm tra xem đã nhập số lượng thực tế cho tất cả các dòng chưa
    const uncounted = count.items.filter((item) => item.actualQuantity === null || item.actualQuantity === undefined);
    if (uncounted.length > 0) {
      throw new BadRequestException(
        `Còn ${uncounted.length} mặt hàng chưa được nhập số lượng thực tế. Vui lòng hoàn thành kiểm đếm trước khi gửi duyệt.`,
      );
    }

    // Kiểm tra xem các mặt hàng chênh lệch đã có lý do giải trình chưa
    const missingReasons = count.items.filter((item) => {
      const varNum = Number(item.variance || 0);
      return varNum !== 0 && (!item.reason || item.reason.trim() === '');
    });

    if (missingReasons.length > 0) {
      throw new BadRequestException(
        `Có ${missingReasons.length} dòng sản phẩm chênh lệch chưa được nhập lý do giải trình. Vui lòng hoàn tất Bước 2 (Nhập lý do chênh lệch).`,
      );
    }

    return this.countRepo.updateStatus(id, distributorId, DocStatus.WAITING_APPROVAL);
  }

  /**
   * Phê duyệt & Cân kho tự động
   */
  async approveCount(id: string | number, distributorId: string | number, userId?: string | number) {
    return this.countRepo.approveAndReconcileCount(id, distributorId, userId);
  }

  /**
   * Từ chối duyệt
   */
  async rejectCount(id: string | number, distributorId: string | number, reason: string) {
    return this.countRepo.updateStatus(id, distributorId, DocStatus.REJECTED, reason);
  }

  /**
   * Hủy phiếu kiểm kê
   */
  async cancelCount(id: string | number, distributorId: string | number) {
    const count = await this.countRepo.findCountById(id, distributorId);
    if (!count) throw new NotFoundException('Không tìm thấy phiếu kiểm kê');
    if (count.status === DocStatus.COMPLETED) {
      throw new BadRequestException('Không thể hủy phiếu kiểm kê đã hoàn tất và cân kho');
    }
    return this.countRepo.updateStatus(id, distributorId, DocStatus.CANCELLED);
  }

  /**
   * Xuất biên bản kiểm kê ra file Excel
   */
  async exportCountExcel(id: string | number, distributorId: string | number): Promise<Buffer> {
    const count = await this.countRepo.findCountById(id, distributorId);
    if (!count) throw new NotFoundException('Không tìm thấy phiếu kiểm kê');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Biên Bản Kiểm Kê');

    worksheet.mergeCells('A1:I1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'BIÊN BẢN KIỂM KÊ KHO HÀNG';
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF0B3D70' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 30;

    worksheet.getCell('A3').value = `Mã phiếu: ${count.countCode}`;
    worksheet.getCell('A3').font = { bold: true };
    worksheet.getCell('E3').value = `Ngày kiểm: ${new Date(count.createdAt).toLocaleDateString('vi-VN')}`;
    worksheet.getCell('E3').font = { bold: true };

    worksheet.getCell('A4').value = `Kho kiểm kê: ${count.warehouse?.name} (${count.warehouse?.code})`;
    worksheet.getCell('E4').value = `Trạng thái: ${count.status}`;

    worksheet.getCell('A5').value = `Hình thức: ${count.countType === CountType.MONTHLY ? 'Định kỳ tháng' : 'Đột xuất theo SKU'}`;
    worksheet.getCell('E5').value = `Người lập: ${count.createdBy?.fullName || 'Hệ thống'}`;

    worksheet.getRow(7).values = [
      'STT',
      'Mã SKU',
      'Tên sản phẩm',
      'Số lô',
      'Hạn sử dụng',
      'Tồn hệ thống',
      'Thực tế đếm',
      'Chênh lệch',
      'Lý do giải trình',
    ];

    const headerRow = worksheet.getRow(7);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1A73E8' },
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    let rowIndex = 8;
    count.items.forEach((item, index) => {
      const row = worksheet.getRow(rowIndex);
      const varVal = item.variance !== null ? Number(item.variance) : 0;

      row.values = [
        index + 1,
        item.stockLot?.product?.sku || '',
        item.stockLot?.product?.name || '',
        item.stockLot?.lotNumber || '',
        item.stockLot?.expiryDate ? new Date(item.stockLot.expiryDate).toLocaleDateString('vi-VN') : '',
        Number(item.systemQuantity),
        item.actualQuantity !== null ? Number(item.actualQuantity) : '',
        varVal,
        item.reason || '',
      ];

      // Highlight chênh lệch
      if (varVal < 0) {
        row.getCell(8).font = { color: { argb: 'FFD32F2F' }, bold: true };
      } else if (varVal > 0) {
        row.getCell(8).font = { color: { argb: 'FF2E7D32' }, bold: true };
      }

      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
      rowIndex++;
    });

    worksheet.columns = [
      { width: 8 },
      { width: 16 },
      { width: 35 },
      { width: 16 },
      { width: 14 },
      { width: 15 },
      { width: 15 },
      { width: 14 },
      { width: 35 },
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
