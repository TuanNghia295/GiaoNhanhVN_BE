import { OrderStatusEnum, OrderTypeEnum } from '@/database/schemas';
type NotificationContent = {
  title: string;
  message: string;
};

export function getOrderNotificationContent(
  status: OrderStatusEnum,
  type: OrderTypeEnum,
  orderCode: string,
): NotificationContent {
  const templates: Record<OrderTypeEnum, Record<OrderStatusEnum, NotificationContent>> = {
    [OrderTypeEnum.FOOD]: {
      [OrderStatusEnum.PENDING]: {
        title: 'Đơn món ăn chờ xác nhận',
        message: `Đơn ${orderCode} (món ăn) đang chờ cửa hàng xác nhận.`,
      },
      [OrderStatusEnum.ACCEPTED]: {
        title: 'Đơn món ăn đã được xác nhận',
        message: `Cửa hàng đã xác nhận đơn ${orderCode} (món ăn). Họ sẽ bắt đầu chuẩn bị.`,
      },
      [OrderStatusEnum.DELIVERING]: {
        title: 'Món ăn đang được giao',
        message: `Đơn ${orderCode} đang trên đường giao tới bạn.`,
      },
      [OrderStatusEnum.DELIVERED]: {
        title: 'Món ăn đã được giao',
        message: `Đơn ${orderCode} đã giao thành công. Chúc bạn ngon miệng!`,
      },
      [OrderStatusEnum.CANCELED]: {
        title: 'Đơn món ăn đã bị hủy',
        message: `Đơn ${orderCode} (món ăn) đã bị hủy. Vui lòng liên hệ hỗ trợ nếu cần.`,
      },
    },

    [OrderTypeEnum.DELIVERY]: {
      [OrderStatusEnum.PENDING]: {
        title: 'Đơn giao hàng chờ xác nhận',
        message: `Đơn ${orderCode} đang chờ cửa hàng hoặc tài xế xác nhận.`,
      },
      [OrderStatusEnum.ACCEPTED]: {
        title: 'Đơn giao hàng đã được xác nhận',
        message: `Đơn ${orderCode} đã được xác nhận. Tài xế sẽ đến lấy hàng sớm.`,
      },
      [OrderStatusEnum.DELIVERING]: {
        title: 'Đơn hàng đang được giao',
        message: `Đơn ${orderCode} đang trên đường giao tới bạn.`,
      },
      [OrderStatusEnum.DELIVERED]: {
        title: 'Đơn hàng đã giao thành công',
        message: `Đơn ${orderCode} đã được giao thành công.`,
      },
      [OrderStatusEnum.CANCELED]: {
        title: 'Đơn giao hàng đã bị hủy',
        message: `Đơn ${orderCode} đã bị hủy. Vui lòng liên hệ nếu cần hỗ trợ.`,
      },
    },

    [OrderTypeEnum.TRANSPORTATION]: {
      [OrderStatusEnum.PENDING]: {
        title: 'Chuyến xe chờ xác nhận',
        message: `Chuyến ${orderCode} đang chờ tài xế nhận.`,
      },
      [OrderStatusEnum.ACCEPTED]: {
        title: 'Chuyến xe đã được nhận',
        message: `Tài xế đã nhận chuyến ${orderCode} và đang di chuyển đến vị trí của bạn.`,
      },
      [OrderStatusEnum.DELIVERING]: {
        title: 'Tài xế đang đón bạn',
        message: `Tài xế đang trên đường đón bạn cho chuyến ${orderCode}.`,
      },
      [OrderStatusEnum.DELIVERED]: {
        title: 'Chuyến xe đã hoàn thành',
        message: `Chuyến ${orderCode} đã hoàn thành. Cảm ơn bạn đã sử dụng dịch vụ.`,
      },
      [OrderStatusEnum.CANCELED]: {
        title: 'Chuyến xe đã bị hủy',
        message: `Chuyến ${orderCode} đã bị hủy. Vui lòng đặt lại nếu cần.`,
      },
    },

    [OrderTypeEnum.ANOTHER_SHOP]: {
      [OrderStatusEnum.PENDING]: {
        title: 'Đơn giao hàng của shop chờ xác nhận',
        message: `Đơn ${orderCode} đang chờ xác nhận từ shop.`,
      },
      [OrderStatusEnum.ACCEPTED]: {
        title: 'Đơn giao hàng của shop đã được xác nhận',
        message: `Đơn ${orderCode} đã được xác nhận và đang chờ lấy hàng.`,
      },
      [OrderStatusEnum.DELIVERING]: {
        title: 'Đang giao hàng của shop',
        message: `Đơn ${orderCode} đang trên đường giao tới shop.`,
      },
      [OrderStatusEnum.DELIVERED]: {
        title: 'Đã giao hàng của shop',
        message: `Đơn ${orderCode} đã được giao tới shop thành công.`,
      },
      [OrderStatusEnum.CANCELED]: {
        title: 'Đơn giao hàng của shop đã bị hủy',
        message: `Đơn ${orderCode} đã bị hủy. Vui lòng liên hệ hỗ trợ nếu cần.`,
      },
    },
  };

  return templates[type][status];
}
