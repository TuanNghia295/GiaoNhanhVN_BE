export type NotificationTemplate = {
  title: string;
  body: string;
  sound: string;
};

export type NotificationTemplateKey =
  | 'NEW_ORDER'
  | 'OTHER_TEMPLATE'
  | 'LOCK_ACCOUNT'
  | 'CANCEL_ORDER'
  | 'ACCEPT_STORE_REQUEST'
  | 'REJECT_STORE_REQUEST';

export const NOTIFICATION_TEMPLATES: Record<NotificationTemplateKey, NotificationTemplate> = {
  NEW_ORDER: {
    title: 'Bạn có một đơn hàng mới',
    body: 'Có một đơn hàng mới cần giao, hãy kiểm tra ngay',
    sound: 'alert',
  },
  LOCK_ACCOUNT: {
    title: 'Tài khoản của bạn đã bị khóa',
    body: 'Tài khoản của bạn đã bị khóa, vui lòng liên hệ quản trị viên để biết thêm chi tiết',
    sound: 'alert',
  },
  CANCEL_ORDER: {
    title: 'Đơn hàng đã bị hủy',
    body: 'Đơn hàng của bạn đã bị hủy, vui lòng kiểm tra lại',
    sound: 'alert',
  },
  OTHER_TEMPLATE: {
    title: 'Thông báo khác',
    body: 'Nội dung khác',
    sound: 'alert',
  },
  ACCEPT_STORE_REQUEST: {
    title: 'Yêu cầu đã được chấp nhận',
    body: 'Yêu cầu của bạn đã được chấp nhận, vui lòng kiểm tra lại',
    sound: 'alert',
  },
  REJECT_STORE_REQUEST: {
    title: 'Yêu cầu đã bị từ chối',
    body: 'Yêu cầu của bạn đã bị từ chối, vui lòng kiểm tra lại',
    sound: 'alert',
  },
};
