export type PlatformSound = {
  android: string;
  ios: string;
};

export type NotificationTemplate = {
  title: string;
  body: string;
  sound: PlatformSound;
};

export type NotificationTemplateKey =
  | 'NEW_ORDER'
  | 'OTHER_TEMPLATE'
  | 'LOCK_ACCOUNT'
  | 'CANCEL_ORDER'; // thêm key khác nếu cần

export const NOTIFICATION_TEMPLATES: Record<
  NotificationTemplateKey,
  NotificationTemplate
> = {
  NEW_ORDER: {
    title: 'Bạn có một đơn hàng mới',
    body: 'Có một đơn hàng mới cần giao, hãy kiểm tra ngay',
    sound: {
      android: 'alert.mp3',
      ios: 'alert.caf',
    },
  },
  LOCK_ACCOUNT: {
    title: 'Tài khoản của bạn đã bị khóa',
    body: 'Tài khoản của bạn đã bị khóa, vui lòng liên hệ quản trị viên để biết thêm chi tiết',
    sound: {
      android: 'alert.mp3',
      ios: 'alert.caf',
    },
  },
  CANCEL_ORDER: {
    title: 'Đơn hàng đã bị hủy',
    body: 'Đơn hàng của bạn đã bị hủy, vui lòng kiểm tra lại',
    sound: {
      android: 'alert.mp3',
      ios: 'alert.caf',
    },
  },
  OTHER_TEMPLATE: {
    title: 'Thông báo khác',
    body: 'Nội dung khác',
    sound: {
      android: 'default.mp3',
      ios: 'default.caf',
    },
  },
};
