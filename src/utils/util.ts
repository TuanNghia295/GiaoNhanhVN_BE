import { OrderStatusEnum } from '@/database/schemas';
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

export const formatDistance = (distanceInMeters: number) =>
  distanceInMeters >= 1000
    ? {
        text: `${Math.round(distanceInMeters / 1000)} km`,
        value: Math.round(distanceInMeters / 1000),
      }
    : {
        text: `${Math.round(distanceInMeters)} m`,
        value: Math.round(distanceInMeters),
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
