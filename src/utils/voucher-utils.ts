// src/utils/voucher-utils.ts
import { DiscountTypeEnum, Voucher } from '@/database/schemas';

export function calculateVoucherDiscount(vouchers: Voucher[], baseAmount: number): number {
  const totalDiscount = vouchers.reduce((sum, v) => {
    if (v.discountType === DiscountTypeEnum.FIXED_AMOUNT) {
      return sum + Number(v.value ?? 0);
    }

    if (v.discountType === DiscountTypeEnum.PERCENTAGE) {
      const percent = Number(v.value ?? 0);
      const discount = (baseAmount * percent) / 100;
      const capped = v.maxDiscount ? Math.min(discount, Number(v.maxDiscount)) : discount;
      return sum + capped;
    }

    return sum;
  }, 0);

  // Tổng giảm giá không được vượt quá giá trị đơn hàng
  return Math.min(totalDiscount, baseAmount);
}
