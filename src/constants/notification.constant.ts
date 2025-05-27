export type PlatformSound = {
  android: string;
  ios: string;
};

export type NotificationTemplate = {
  title: string;
  body: string;
  sound: PlatformSound;
};

export type NotificationTemplateKey = 'NEW_ORDER' | 'OTHER_TEMPLATE'; // thêm key khác nếu cần

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
  OTHER_TEMPLATE: {
    title: 'Thông báo khác',
    body: 'Nội dung khác',
    sound: {
      android: 'default.mp3',
      ios: 'default.caf',
    },
  },
};
