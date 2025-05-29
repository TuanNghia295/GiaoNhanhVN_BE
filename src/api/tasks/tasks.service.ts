import { DRIZZLE } from '@/database/global';
import { vouchers, VouchersStatusEnum } from '@/database/schemas';
import { DrizzleDB } from '@/database/types/drizzle';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { and, gt, lte } from 'drizzle-orm';
import { DateTime } from 'luxon';

@Injectable()
export class TasksService implements OnModuleInit {
  private readonly logger = new Logger(TasksService.name);

  onModuleInit() {
    this.logger.log('TasksService initialized');
    this.handleCronUpdateVouchersStatus();
  }

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // Corn job 0h việt time
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    name: 'vouchers.update-status',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  handleCronUpdateVouchersStatus() {
    this.logger.debug('Called every day at 0:00 AM (Vietnam time)');
    const now = DateTime.now();

    // Hết hạn
    this.db
      .update(vouchers)
      .set({ status: VouchersStatusEnum.EXPIRED })
      .where(lte(vouchers.endDate, now.toJSDate()))
      .execute()
      .then(() => {
        this.logger.log('Vouchers status updated to EXPIRED');
      })
      .catch((error) => {
        this.logger.error('Error updating vouchers status', error);
      });

    // Đang hoạt động
    this.db
      .update(vouchers)
      .set({ status: VouchersStatusEnum.ACTIVE })
      .where(
        and(
          lte(vouchers.startDate, now.toJSDate()),
          gt(vouchers.endDate, now.toJSDate()),
        ),
      )
      .execute()
      .then(() => {
        this.logger.log('Vouchers status updated to ACTIVE');
      })
      .catch((error) => {
        this.logger.error('Error updating vouchers status', error);
      });

    // Chưa bắt đầu
    this.db
      .update(vouchers)
      .set({ status: VouchersStatusEnum.PENDING })
      .where(gt(vouchers.startDate, now.toJSDate()))
      .execute()
      .then(() => {
        this.logger.log('Vouchers status updated to PENDING');
      })
      .catch((error) => {
        this.logger.error('Error updating vouchers status', error);
      });
  }
}
