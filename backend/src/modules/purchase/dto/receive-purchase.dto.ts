export interface ReceivePoItemInputDto {
  itemId?: string | number | bigint;
  poItemId?: string | number | bigint;
  quantityReceived?: number;
  quantityReceivedNow?: number;
  lotNumber?: string;
  manufactureDate?: string | Date | null;
  mfgDate?: string | Date | null;
  expiryDate?: string | Date | null;
  expDate?: string | Date | null;
  locationCode?: string | null;
}

export class ReceiveGoodsDto {
  distributorId?: string | number | bigint;
  userId?: string | number | bigint | null;
  notes?: string | null;
  items: ReceivePoItemInputDto[];
}

export class ReceiveTripGoodsDto {
  tripId: string | number | bigint;
  distributorId?: string | number | bigint;
  userId?: string | number | bigint | null;
  notes?: string | null;
  receivedItems: ReceivePoItemInputDto[];
}
