import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { Public } from '../../common/decorators/public.decorator';

@Public()
@Controller(['delivery', 'delivery-trips'])
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Get()
  async getDeliveryTrips(@Query() query: any) {
    const {
      distributorId = 1,
      status,
      tripType,
      warehouseId,
      search,
      page = 1,
      limit = 15,
    } = query;

    return this.deliveryService.getDeliveryTrips({
      distributorId,
      status,
      tripType,
      warehouseId,
      search,
      page,
      limit,
    });
  }

  @Post()
  async createDeliveryTrip(@Body() body: any) {
    const {
      distributorId = 1,
      warehouseId,
      driverId,
      licensePlate,
      maxWeightKg,
      expectedDeliveryDate,
      notes,
    } = body;

    if (!warehouseId) {
      throw new BadRequestException('Kho xuất hàng là bắt buộc');
    }

    return this.deliveryService.createDeliveryTrip({
      distributorId,
      warehouseId,
      driverId,
      licensePlate,
      maxWeightKg,
      expectedDeliveryDate,
      notes,
    });
  }

  @Get('dispatchable-orders')
  async getDispatchableOrders(@Query() query: any) {
    const { distributorId = 1, warehouseId } = query;
    const orders = await this.deliveryService.getDispatchableOrders(
      distributorId,
      warehouseId,
    );
    return { data: orders };
  }

  @Get('drivers/availability')
  async getDriverAvailability(@Query() query: any) {
    const { distributorId = 1, date } = query;
    const drivers = await this.deliveryService.getDriverAvailability(
      distributorId,
      date,
    );
    return { data: drivers };
  }

  @Get(':id')
  async getDeliveryTripDetail(
    @Param('id') id: string,
    @Query('distributorId') distributorId: any = 1,
  ) {
    return this.deliveryService.getDeliveryTripDetail(id, distributorId);
  }

  @Get(':id/manifest')
  async getTripCargoManifest(
    @Param('id') id: string,
    @Query('distributorId') distributorId: any = 1,
  ) {
    return this.deliveryService.getTripCargoManifest(id, distributorId);
  }

  @Get(':id/map')
  async getTripMapData(
    @Param('id') id: string,
    @Query('distributorId') distributorId: any = 1,
  ) {
    const manifest = await this.deliveryService.getTripCargoManifest(id, distributorId);
    if (!manifest) return { stops: [], warehouseName: '' };

    // Trả về dữ liệu gọn cho bản đồ
    return {
      tripCode: manifest.tripCode,
      licensePlate: manifest.licensePlate,
      driverName: manifest.driverName,
      warehouseName: manifest.warehouseName,
      warehouseCoords: manifest.warehouseCoords || null,
      stops: manifest.retailerStops.map((stop: any) => ({
        stopNumber: stop.stopNumber,
        retailerName: stop.retailerName,
        retailerCode: stop.retailerCode,
        orderCode: stop.orderCode,
        status: stop.status,
        address: stop.address,
        phone: stop.phone,
        lat: stop.lat,
        lng: stop.lng,
        orderWeightKg: stop.orderWeightKg,
        totalAmount: stop.totalAmount,
        deliveryNotes: stop.deliveryNotes,
      })),
    };
  }


  @Get(':id/return-summary')
  async getTripReturnSummary(
    @Param('id') id: string,
    @Query('distributorId') distributorId: any = 1,
  ) {
    return this.deliveryService.getTripReturnSummary(id, distributorId);
  }


  @Post(':id/dispatch-orders')
  async dispatchOrdersToTrip(@Param('id') tripId: string, @Body() body: any) {
    const { distributorId = 1, orderIds, changedById } = body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      throw new BadRequestException('Vui lòng chọn ít nhất 1 đơn hàng để xếp lên xe');
    }

    return this.deliveryService.dispatchOrdersToTrip({
      tripId,
      distributorId,
      orderIds,
      changedById,
    });
  }

  @Post(':id/remove-order')
  async removeOrderFromTrip(@Param('id') tripId: string, @Body() body: any) {
    const { distributorId = 1, orderId, changedById } = body;

    if (!orderId) {
      throw new BadRequestException('Mã đơn hàng là bắt buộc');
    }

    return this.deliveryService.removeOrderFromTrip({
      tripId,
      distributorId,
      orderId,
      changedById,
    });
  }

  @Post(':id/confirm-delivery')
  async confirmStopDelivery(@Param('id') tripId: string, @Body() body: any) {
    const {
      distributorId = 1,
      orderId,
      status,
      deliveryFailedReason,
      returnedItems,
      returnNotes,
      paymentCollected,
      paymentMethod,
      changedById,
    } = body;

    return this.deliveryService.confirmStopDelivery({
      tripId,
      distributorId,
      orderId,
      status,
      deliveryFailedReason,
      returnedItems,
      returnNotes,
      paymentCollected,
      paymentMethod,
      changedById,
    });
  }

  @Post(':id/close-trip')
  async closeDeliveryTrip(@Param('id') tripId: string, @Body() body: any) {
    const { distributorId = 1, destinationWarehouseId, notes, changedById } = body;

    return this.deliveryService.closeDeliveryTrip({
      tripId,
      distributorId,
      destinationWarehouseId,
      notes,
      changedById,
    });
  }

  @Patch(':id/status')
  async updateDeliveryTripStatus(@Param('id') id: string, @Body() body: any) {
    const { distributorId = 1, status, changedById, notes } = body;

    if (!status) {
      throw new BadRequestException('Trạng thái chuyến xe là bắt buộc');
    }

    return this.deliveryService.updateTripStatus({
      tripId: id,
      distributorId,
      toStatus: status,
      changedById,
      notes,
    });
  }
}
