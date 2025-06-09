import { OrderStatusEnum } from '@/database/schemas';
import { existsSync, unlinkSync } from 'fs';
import path, { join } from 'path';

export const normalizeImagePath = (imagePath: string) => {
  return path.join(imagePath).replace(/\\/g, '/').replace('uploads/', '');
};

// hàm format số điện thoại vietname  +84
export const formatVietnamPhoneNumber = (phoneNumber: string) => {
  if (!phoneNumber) return '';
  const phone = phoneNumber.replace(/[^0-9]/g, '');
  if (phone.startsWith('84')) {
    return `+${phone}`;
  } else if (phone.startsWith('0')) {
    return `+84${phone.slice(1)}`;
  }
  return `+84${phone}`;
};

export const formatDistance = (distanceInKilometers: number) => {
  const isKm = distanceInKilometers >= 1;
  const value = isKm
    ? parseFloat(distanceInKilometers.toFixed(1))
    : Math.round(distanceInKilometers * 1000);

  return {
    text: isKm ? `${value} km` : `${value} m`,
    value,
  };
};

export const allowedTransitions: Record<OrderStatusEnum, OrderStatusEnum[]> = {
  [OrderStatusEnum.PENDING]: [
    OrderStatusEnum.ACCEPTED,
    OrderStatusEnum.CANCELED,
  ],
  [OrderStatusEnum.ACCEPTED]: [
    OrderStatusEnum.DELIVERING,
    OrderStatusEnum.CANCELED,
  ],
  [OrderStatusEnum.DELIVERING]: [OrderStatusEnum.DELIVERED],
  [OrderStatusEnum.DELIVERED]: [],
  [OrderStatusEnum.CANCELED]: [],
};

export function getOrderStatusLabel(status: OrderStatusEnum | string): string {
  const statusLabels: Record<OrderStatusEnum, string> = {
    [OrderStatusEnum.PENDING]: 'Đang chờ',
    [OrderStatusEnum.ACCEPTED]: 'Đã nhận',
    [OrderStatusEnum.DELIVERING]: 'Đang giao hàng',
    [OrderStatusEnum.DELIVERED]: 'Đã hoàn thành',
    [OrderStatusEnum.CANCELED]: 'Đã hủy',
  };
  return statusLabels[status as OrderStatusEnum] ?? 'Không xác định';
}

export function deleteIfExists(relativePath: string, basePath: string) {
  const fullPath = join(basePath, relativePath.replace(/^\/+/, ''));

  if (existsSync(fullPath)) {
    try {
      unlinkSync(fullPath);
      this.logger.log(`Deleted file: ${fullPath}`);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${fullPath}`, error.stack);
    }
  }
}
