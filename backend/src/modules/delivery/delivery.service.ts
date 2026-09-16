import { Injectable, NotFoundException } from '@nestjs/common';
import { DeliveryTripService } from './delivery-trip.service';

@Injectable()
export class DeliveryService {
  constructor(private readonly deliveryTripService: DeliveryTripService) {}

  async getDeliveryTrips(params: any) {
    return this.deliveryTripService.getDeliveryTrips(params);
  }

  async getDeliveryTripDetail(id: string, distributorId: any) {
    const trip = await this.deliveryTripService.getDeliveryTripDetail(id, distributorId);
    if (!trip) {
      throw new NotFoundException('Không tìm thấy chuyến xe');
    }
    return trip;
  }

  async getDispatchableOrders(distributorId: any, warehouseId: any) {
    return this.deliveryTripService.getDispatchableOrders(distributorId, warehouseId);
  }

  async createDeliveryTrip(params: any) {
    return this.deliveryTripService.createDeliveryTrip(params);
  }

  async dispatchOrdersToTrip(params: any) {
    return this.deliveryTripService.dispatchOrdersToTrip(params);
  }

  async removeOrderFromTrip(params: any) {
    return this.deliveryTripService.removeOrderFromTrip(params);
  }

  async updateTripStatus(params: any) {
    return this.deliveryTripService.updateTripStatus(params);
  }

  async getTripCargoManifest(id: string, distributorId: any) {
    return this.deliveryTripService.getTripCargoManifest(id, distributorId);
  }

  async confirmStopDelivery(params: any) {
    return this.deliveryTripService.confirmStopDelivery(params);
  }

  async getTripReturnSummary(id: string, distributorId: any) {
    return this.deliveryTripService.getTripReturnSummary(id, distributorId);
  }

  async closeDeliveryTrip(params: any) {
    return this.deliveryTripService.closeDeliveryTrip(params);
  }
}

// Alias for backward compatibility if imported elsewhere
export { DeliveryService as DeliveryTripService };
