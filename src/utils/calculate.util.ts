import { OrderTypeEnum } from '@/database/schemas';

/**
 * Làm tròn lên đến precision chữ số thập phân
 */
export function roundUp(value: number, precision: number = 3): number {
  const factor = Math.pow(10, precision);
  return Math.ceil(value * factor) / factor;
}

/**
 * Tính số tiền trả cho cửa hàng (FOOD), làm tròn lên theo `precision`
 */
export function calculatePayForShop(
  type: OrderTypeEnum,
  totalProduct: number,
  storeServiceFee: number,
  totalVoucherStore: number,
  totalProductTax: number,
  precision: number = 3,
): number {
  if (type !== OrderTypeEnum.FOOD) return 0;

  const gross = totalProduct - storeServiceFee - totalVoucherStore;
  const nonNegativeGross = Math.max(gross, 0);

  // ✅ không để bị âm ở bước nào
  const net = Math.max(nonNegativeGross - totalProductTax, 0);

  return roundUp(net, precision);
}
