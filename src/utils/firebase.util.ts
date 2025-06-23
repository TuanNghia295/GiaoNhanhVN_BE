import admin from 'firebase-admin';

interface BuildMessageOptions {
  tokens: string[];
  title: string;
  body: string;
  sound?: string;
  data?: Record<string, string>;
}

export function buildMulticastMessage({
  tokens,
  title,
  body,
  sound = 'default', // mặc định có sound
  data = {},
}: BuildMessageOptions): admin.messaging.MulticastMessage {
  return {
    tokens,
    data,
    android: {
      priority: 'high',
      ttl: 60 * 1000,
      notification: {
        sound,
      },
    },
    apns: {
      headers: {
        'apns-expiration': `${Math.floor(Date.now() / 1000) + 60}`,
        'apns-priority': '10',
      },
      payload: {
        aps: {
          alert: {
            title,
            body,
          },
          sound,
        },
      },
    },
  };
}
