import {
  NOTIFICATION_TEMPLATES,
  NotificationTemplateKey,
} from '@/constants/notification.constant';
import admin from 'firebase-admin';

export function buildMulticastMessage(
  tokens: string[],
  templateKey: NotificationTemplateKey,
  customData?: Record<string, string>, // thêm optional custom data
): admin.messaging.MulticastMessage {
  const template = NOTIFICATION_TEMPLATES[templateKey];

  return {
    tokens,
    data: {
      title: template.title,
      body: template.body,
      sound: template.sound,
      ...customData, // merge custom fields vào đây
    },
    android: {
      priority: 'high',
      ttl: 60 * 1000,
    },
    apns: {
      headers: {
        'apns-push-type': 'background',
        'apns-priority': '5',
        'apns-expiration': `${Math.floor(Date.now() / 1000) + 60}`,
      },
      payload: {
        aps: {
          'content-available': 1,
        },
      },
    },
  };
}
