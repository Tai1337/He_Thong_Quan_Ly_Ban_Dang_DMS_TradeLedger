import { Injectable } from '@nestjs/common';
import { ShopPortalService } from './shop-portal.service';
import { EventsGateway } from '../../events/events.gateway';

@Injectable()
export class ShopService {
  constructor(
    private readonly shopPortalService: ShopPortalService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async registerCustomer(payload: any) {
    return this.shopPortalService.registerCustomer(payload);
  }

  async loginCustomer(phone: string, pass: string) {
    return this.shopPortalService.loginCustomer(phone, pass);
  }

  async getCustomerProfile(customerId: string) {
    return this.shopPortalService.getCustomerProfile(customerId);
  }

  async getShopProducts(params: any) {
    return this.shopPortalService.getShopProducts(params);
  }

  async getShopCategories() {
    return this.shopPortalService.getShopCategories();
  }

  async getShopProductDetail(id: string, accountType?: string) {
    return this.shopPortalService.getShopProductDetail(id, accountType);
  }

  async placeShopOrder(payload: any) {
    return this.shopPortalService.placeShopOrder(payload, this.eventsGateway.server);
  }

  async getCustomerOrders(customerId: string) {
    return this.shopPortalService.getCustomerOrders(customerId);
  }

  async getOrderDetailByCode(orderCode: string) {
    return this.shopPortalService.getOrderDetailByCode(orderCode);
  }
}

