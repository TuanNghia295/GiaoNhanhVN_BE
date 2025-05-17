import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { Telegraf } from 'telegraf';

@Injectable()
export class BotTelegramServices implements OnModuleInit {
  private bot: Telegraf | null = null;
  private subscribersFilePath: string;
  private isBotRunning = false; // ✅ Kiểm soát để bot chỉ chạy một lần

  constructor() {
    if (process.env.TELE_BOT_TOKEN) {
      this.bot = new Telegraf(process.env.TELE_BOT_TOKEN);
      this.subscribersFilePath = path.join(process.cwd(), './subscribers.json');
      this.ensureSubscribersFileExists();
    } else {
      console.warn('⚠️ Không có TELE_BOT_TOKEN, bot sẽ không chạy.');
    }
  }

  async onModuleInit() {
    if (!this.bot || !process.env.TELE_BOT_TOKEN || this.isBotRunning) {
      console.log('⚠️ Bot đã chạy hoặc không có token, bỏ qua launch.');
      return;
    }

    this.bot.on('message', async (ctx) => {
      const chatId = ctx.chat.id;
      const chatType = ctx.chat.type;
      const subscribers = this.getSubscribers();

      if (!subscribers.some((sub) => sub.chatId === chatId)) {
        subscribers.push({ chatId, chatType });
        this.saveSubscribers(subscribers);

        await this.bot.telegram.sendMessage(
          chatId,
          'Group này đã đăng ký nhận thông báo.',
        );
      } else {
        console.log(`📌 Group ID ${chatId} đã được đăng ký trước đó.`);
      }
    });

    try {
      // this.bot.launch();
      console.log('✅ Bot đã khởi chạy thành công!');

      // ⏳ Dừng bot sau 3 giây
      setTimeout(() => {
        console.log('⏹️ Bot đã chạy đủ 3 giây, đang dừng...');
        // this.bot?.stop();
        // this.isBotRunning = false;
        console.log('✅ Bot đã dừng thành công.');
      }, 3000); // ⏰ 3 giây
    } catch (error: any) {
      console.error('❌ Lỗi khi khởi chạy bot:', error.message);

      // Nếu lỗi là ETIMEDOUT hoặc FetchError, chỉ cảnh báo chứ không crash app
      if (error.code === 'ETIMEDOUT' || error.type === 'system') {
        console.warn(
          '⚠️ Bot không thể kết nối với Telegram (timeout), nhưng app vẫn tiếp tục chạy.',
        );
      } else {
        console.error('⚠️ Lỗi không xác định:', error);
      }

      this.isBotRunning = false; // Đánh dấu bot là chưa chạy để thử lại sau
    }
  }

  private ensureSubscribersFileExists() {
    if (!fs.existsSync(this.subscribersFilePath)) {
      fs.writeFileSync(this.subscribersFilePath, JSON.stringify([]));
    }
  }

  private getSubscribers(): { chatId: number; chatType: string }[] {
    const data = fs.readFileSync(this.subscribersFilePath, 'utf-8');
    return JSON.parse(data);
  }

  private saveSubscribers(subscribers: { chatId: number; chatType: string }[]) {
    fs.writeFileSync(
      this.subscribersFilePath,
      JSON.stringify(subscribers, null, 2),
    );
  }

  async sendNotification(message: string) {
    if (!process.env.TELE_BOT_TOKEN || !this.bot) {
      console.warn(
        '⚠️ Không có TELE_BOT_TOKEN hoặc bot chưa khởi chạy, không thể gửi tin nhắn.',
      );
      return;
    }

    const subscribers = this.getSubscribers();
    for (const subscriber of subscribers) {
      try {
        await this.bot.telegram.sendMessage(subscriber.chatId, `${message}`);
      } catch (error) {
        console.error(
          `❌ Lỗi khi gửi thông báo tới Group ID ${subscriber.chatId}:`,
          error,
        );
      }
    }
  }
}
