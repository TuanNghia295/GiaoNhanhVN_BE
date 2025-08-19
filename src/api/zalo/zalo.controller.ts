import { LoginResDto } from '@/api/auth/dto/login.res.dto';
import { OTPCodeResDto } from '@/api/zalo/dto/otp-code.res.dto';
import { VerifyOtpReqDto } from '@/api/zalo/dto/verify-otp.req.dto';
import { ZaloCallbackReqDto } from '@/api/zalo/dto/zalo-callback.req.dto';
import { ApiPublic } from '@/decorators/http.decorators';
import { Controller, Get, Post, Query } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { ZaloService } from './zalo.service';

@Controller('zalo')
export class ZaloController {
  constructor(private readonly zaloService: ZaloService) {}

  @ApiPublic({
    summary: 'Gửi mã OTP đến số điện thoại',
    type: OTPCodeResDto,
  })
  @Get('send-otp')
  async sendOtpToPhone(@Query('phone') phone: string) {
    return await this.zaloService.sendZaloOtp(phone);
  }

  @ApiExcludeEndpoint()
  @ApiPublic({
    summary: 'Callback từ Zalo',
  })
  @Get('callback')
  async callbackFromZalo(@Query() dto: ZaloCallbackReqDto) {
    return await this.zaloService.callbackFromZalo(dto);
  }

  @ApiPublic({
    summary: 'Xác thực mã OTP',
    type: LoginResDto,
  })
  @Post('verify-otp')
  async verifyOtp(@Query() reqDto: VerifyOtpReqDto) {
    return await this.zaloService.verifyOtp(reqDto);
  }

  // @ApiExcludeEndpoint()
  // @ApiPublic({
  //   summary: 'Callback từ Zalo',
  // })
  // @Get('callback')
  // async callbackFromZalo(@Query() dto: ZaloCallbackReqDto) {
  //   return await this.zaloService.callbackFromZalo(dto);
  // }
}
