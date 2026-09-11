import xlsx from 'xlsx';
import { PrismaClient } from '@prisma/client';
import path from 'path';

const prisma = new PrismaClient();

const parseDate = (dateStr) => {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00Z`);
  }
  return null;
};

async function main() {
  const filePath = path.resolve('../BaoCaoTonKhoNPP_20260813145648.xlsx');
  console.log('Reading Excel file:', filePath);
  
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

  // Dữ liệu bắt đầu từ dòng index 4
  const dataRows = rows.slice(4).filter(row => row && row[0]);

  console.log(`Found ${dataRows.length} rows to import.`);

  for (const row of dataRows) {
    const distCode = row[0];
    const distName = row[1];
    const channel = row[2];
    const whCode = row[3] || 'UNKNOWN';
    const whName = row[4] || 'Kho NPP mặc định';
    const region = row[5];
    const lotStatusStr = row[6]; // Good / Defective
    const sku = row[7];
    const productName = row[8];
    const lotNumber = row[9];
    const mfgDateStr = row[10];
    const expDateStr = row[11];
    const unitBig = row[12];
    const unitSmall = row[13];
    const productType = row[14];
    const stdSku = row[16];
    const stdSkuName = row[17];
    const groupStdSku = row[18];
    const saleStatus = row[19] === 'Đang bán';
    const basePrice = row[20] || 0;
    const conversionRate = parseInt(row[21]) || 1;
    const totalSmallQty = row[24] || 0;
    const locationTypeStr = row[26];
    const locationCode = row[27];
    const locationName = row[28];

    // 1. Upsert Distributor
    const distributor = await prisma.distributor.upsert({
      where: { code: distCode },
      update: {
        name: distName || distCode,
        channel: channel || null,
        region: region || null
      },
      create: {
        code: distCode,
        name: distName || distCode,
        channel: channel || null,
        region: region || null
      }
    });

    // 2. Upsert Warehouse
    const whType = locationTypeStr === 'Kho hàng bán' ? 'SALES' : 'VANSALE';
    let warehouse = await prisma.warehouse.findUnique({
      where: {
        distributorId_code: {
          distributorId: distributor.id,
          code: whCode
        }
      }
    });
    if (!warehouse) {
      warehouse = await prisma.warehouse.create({
        data: {
          distributorId: distributor.id,
          code: whCode,
          name: whName,
          type: whType
        }
      });
    }

    // 3. Upsert Product
    const product = await prisma.product.upsert({
      where: { sku: sku },
      update: {
        name: productName,
        unit: unitBig || 'THÙNG',
        retailUnit: unitSmall || null,
        productType: productType || null,
        stdSku: stdSku ? stdSku.toString() : null,
        stdSkuName: stdSkuName || null,
        groupStdSku: groupStdSku || null,
        conversionRate: conversionRate,
        basePrice: parseFloat(basePrice),
        status: saleStatus
      },
      create: {
        sku: sku,
        name: productName,
        unit: unitBig || 'THÙNG',
        retailUnit: unitSmall || null,
        productType: productType || null,
        stdSku: stdSku ? stdSku.toString() : null,
        stdSkuName: stdSkuName || null,
        groupStdSku: groupStdSku || null,
        conversionRate: conversionRate,
        basePrice: parseFloat(basePrice),
        status: saleStatus
      }
    });

    // 4. Upsert StockLot
    const lotStatus = lotStatusStr?.toUpperCase() === 'DEFECTIVE' ? 'DEFECTIVE' : 'GOOD';
    const mfgDate = parseDate(mfgDateStr);
    const expDate = parseDate(expDateStr);

    let stockLot = await prisma.stockLot.findUnique({
      where: {
        productId_warehouseId_lotNumber: {
          productId: product.id,
          warehouseId: warehouse.id,
          lotNumber: lotNumber || 'N/A'
        }
      }
    });

    if (!stockLot) {
      stockLot = await prisma.stockLot.create({
        data: {
          productId: product.id,
          warehouseId: warehouse.id,
          lotNumber: lotNumber || 'N/A',
          manufactureDate: mfgDate,
          expiryDate: expDate,
          status: lotStatus,
          locationCode: locationCode || null,
          locationName: locationName || null
        }
      });
    } else {
      stockLot = await prisma.stockLot.update({
        where: { id: stockLot.id },
        data: {
          status: lotStatus,
          locationCode: locationCode || null,
          locationName: locationName || null
        }
      });
    }

    // 5. Upsert StockBalance
    await prisma.stockBalance.upsert({
      where: { lotId: stockLot.id },
      update: {
        quantityOnHand: totalSmallQty
      },
      create: {
        lotId: stockLot.id,
        quantityOnHand: totalSmallQty
      }
    });
  }

  console.log('Import completed successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
