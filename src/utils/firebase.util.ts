import admin from 'firebase-admin';

interface BuildMessageOptions {
  tokens: string[];
  title: string;
  body: string;
  sound?:
    | {
        android?: string;
        ios?: string;
      }
    | string; // có thể là một chuỗi hoặc một đối tượng với sound cho Android và iOS
  data?: Record<string, string>;
}

interface BuildTopicMessageOptions {
  topic: string;
  title: string;
  body: string;
  sound?:
    | {
        android?: string;
        ios?: string;
      }
    | string; // có thể là một chuỗi hoặc một đối tượng với sound cho Android và iOS
  data?: Record<string, string>;
}

export function buildTopicMessage({
  topic,
  title,
  body,
  sound = 'default', // mặc định có sound
  data = {},
}: BuildTopicMessageOptions): admin.messaging.Message {
  return {
    topic: topic,
    notification: {
      title: title,
      body: body,
    },
    android: {
      ttl: 60 * 1000,
      priority: 'high',
      notification: {
        sound: typeof sound === 'string' ? sound : sound.android || 'default',
        channelId: 'alert-channel',
      },
    },
    apns: {
      headers: {
        'apns-priority': '10',
      },
      payload: {
        aps: {
          // badge: 1,
          sound: typeof sound === 'string' ? sound : sound.ios || 'default',
        },
      },
    },
    data: {
      type: 'new_order',
      createdAt: new Date().toISOString(),
      ...data, // thêm dữ liệu bổ sung nếu có
    },
  };
}

export function buildMulticastMessage({
  tokens,
  title,
  body,
  sound = 'default', // mặc định có sound
  data = {},
}: BuildMessageOptions): admin.messaging.MulticastMessage {
  return {
    tokens: tokens,
    notification: {
      title: title,
      body: body,
    },
    android: {
      priority: 'high',
      notification: {
        sound: typeof sound === 'string' ? sound : sound.android || 'default',
      },
    },
    apns: {
      payload: {
        aps: {
          alert: {
            title: title,
            body: body,
          },
          sound: typeof sound === 'string' ? sound : sound.ios || 'default',
        },
      },
    },
    data: {
      title: title,
      body: body,
      ...data, // thêm dữ liệu bổ sung nếu có
      sound: typeof sound === 'string' ? sound : 'default',
    },
  };
}
