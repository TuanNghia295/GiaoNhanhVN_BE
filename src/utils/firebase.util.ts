import {
  NOTIFICATION_TEMPLATES,
  NotificationTemplateKey,
} from '@/constants/notification.constant';
import admin from 'firebase-admin';

export function buildMulticastMessage(
  tokens: string[],
  templateKey: NotificationTemplateKey,
): admin.messaging.MulticastMessage {
  const template = NOTIFICATION_TEMPLATES[templateKey];

  return {
    tokens,
    notification: {
      title: template.title,
      body: template.body,
    },
    data: {
      title: template.title,
      body: template.body,
      sound: template.sound.ios, // default cho iOS
    },
    android: {
      notification: {
        title: template.title,
        body: template.body,
        sound: template.sound.android,
      },
    },
    apns: {
      payload: {
        aps: {
          alert: {
            title: template.title,
            body: template.body,
          },
          sound: template.sound.ios,
        },
      },
    },
  };
}
