import { JwtPayloadType } from '@/api/auth/types/jwt-payload.type';
import { CreateNotificationReqDto } from '@/api/notifications/dto/create-notification.req.dto';
import { NotificationResDto } from '@/api/notifications/dto/notification.res.dto';
import { PageNotificationsReqDto } from '@/api/notifications/dto/page-notifications-req.dto';
import { UpdateNotificationReqDto } from '@/api/notifications/dto/update-notification.req.dto';
import { RoleEnum } from '@/database/schemas';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { ApiAuth } from '@/decorators/http.decorators';
import { Roles } from '@/decorators/role.decorator';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Roles(RoleEnum.MANAGEMENT)
  @ApiAuth({
    summary: 'Tạo thông báo',
    type: NotificationResDto,
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('image', {
      fileFilter: (req, file, callback) => {
        const fileTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (fileTypes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(new Error('Invalid file type'), false);
        }
      },
      storage: memoryStorage(),
    }),
  )
  @Post()
  async create(
    @CurrentUser() payload: JwtPayloadType,
    @Body() reqDto: CreateNotificationReqDto,
    @UploadedFile() image: Express.Multer.File,
  ) {
    return await this.notificationsService.create(payload, reqDto, image);
  }

  @Roles(RoleEnum.USER)
  @ApiAuth({
    summary: 'Lấy danh sách thông báo [ALL]',
    type: NotificationResDto,
  })
  @Get()
  async getPageNotifications(
    @CurrentUser() payload: JwtPayloadType,
    @Query() reqDto: PageNotificationsReqDto,
  ) {
    return await this.notificationsService.getPageNotifications(
      reqDto,
      payload,
    );
  }

  @Roles(RoleEnum.USER)
  @ApiAuth({
    summary: 'Lấy thông báo của tôi',
    type: NotificationResDto,
  })
  @Get('my-notifications')
  async getMyNotifications(@CurrentUser() payload: JwtPayloadType) {
    return await this.notificationsService.getMyNotifications(payload);
  }

  @Roles(RoleEnum.ADMIN)
  @ApiAuth({
    summary: 'Lấy thông báo theo id [ADMIN]',
    type: NotificationResDto,
  })
  @Get('get/:id')
  getDetail(@Param('id', ParseIntPipe) id: number) {
    return this.notificationsService.getDetail(id);
  }

  @Roles(RoleEnum.USER)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('image', {
      fileFilter: (req, file, callback) => {
        const fileTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (fileTypes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(new Error('Invalid file type'), false);
        }
      },
      storage: memoryStorage(),
    }),
  )
  @Patch('update/:id')
  @ApiAuth({
    summary: 'Cập nhật thông báo',
    type: NotificationResDto,
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() reqDto: UpdateNotificationReqDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return await this.notificationsService.update(id, reqDto, image);
  }

  @Roles(RoleEnum.USER)
  @ApiAuth({
    summary: 'Lấy số lượng thông báo chưa đọc',
    type: NotificationResDto,
  })
  @Get('unread-count')
  async getUnreadCount(@CurrentUser() payload: JwtPayloadType) {
    return await this.notificationsService.getUnreadCount(payload);
  }

  @Roles(RoleEnum.USER)
  @ApiAuth({
    summary: 'Đọc thông báo',
    type: NotificationResDto,
  })
  @Patch('read')
  async read(@CurrentUser() payload: JwtPayloadType) {
    return await this.notificationsService.markAsRead(payload);
  }

  @Roles(RoleEnum.USER)
  @ApiAuth({
    summary: 'Xóa thông báo',
  })
  @Delete('delete/:id')
  async remove(
    @CurrentUser() payload: JwtPayloadType,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.notificationsService.remove(id, payload);
  }
}
