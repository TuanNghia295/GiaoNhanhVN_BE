import { OrderStatusEnum } from '@/database/schemas';
import { existsSync, unlinkSync } from 'fs';
import path from 'path';

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
  [OrderStatusEnum.DELIVERING]: [
    OrderStatusEnum.DELIVERED,
    OrderStatusEnum.CANCELED,
  ],
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
  const filename = path.basename(relativePath);
  console.log(`Deleting file: ${filename}`);

  const fullPath = path.join(process.cwd(), basePath, filename);
  console.log(`Attempting to delete file: ${fullPath}`);

  if (existsSync(fullPath)) {
    try {
      unlinkSync(fullPath);
      console.log(`File deleted successfully: ${fullPath}`);
    } catch (error) {
      console.error(`Error deleting file ${fullPath}:`, error);
    }
  }
}

export function generateCodeFromName(name: string): string {
  const normalized = name
    .normalize('NFD') // Loại dấu tiếng Việt
    .replace(/[\u0300-\u036f]/g, '') // Loại ký tự dấu
    .replace(/[^a-zA-Z0-9]/g, '') // Loại ký tự đặc biệt
    .toUpperCase();

  const prefix = normalized.slice(0, 3); // Lấy 3 ký tự đầu tiên
  const random = Math.random().toString(36).substring(2, 6).toUpperCase(); // Random 4 ký tự

  return `${prefix}-${random}`;
}
