import { OrderTypeEnum } from '@/database/schemas';
import _ from 'lodash';

function safeNumber(val: number, digits = 10): number {
  return Number(val.toFixed(digits));
}

export function calculatePayForShop(
  type: OrderTypeEnum,
  totalProduct: number,
  storeServiceFee: number,
  totalVoucherStore: number,
  totalProductTax: number,
  precision: number = 3,
): number {
  if (type !== OrderTypeEnum.FOOD) return 0;

  const gross = safeNumber(totalProduct - storeServiceFee - totalVoucherStore);
  const net = safeNumber(Math.max(gross, 0) - totalProductTax);

  return _.round(net, precision);
}
