import { AuthService } from '@/api/auth/auth.service';
import { LoginReqDto } from '@/api/auth/dto/login.req.dto';
import { LoginResDto } from '@/api/auth/dto/login.res.dto';
import { JwtPayloadType } from '@/api/auth/types/jwt-payload.type';
import { CreateUserReqDto } from '@/api/users/dto/create-user.req.dto';
import { LockUserReqDto } from '@/api/users/dto/lock-user.req.dto';
import { PageUserReqDto } from '@/api/users/dto/page-user.req.dto';
import { UpdateUserReqDto } from '@/api/users/dto/update-user.req.dto';
import { UserResDto } from '@/api/users/dto/user.res.dto';
import { UsersService } from '@/api/users/users.service';
import { RoleEnum } from '@/database/schemas';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { ApiAuth, ApiPublic } from '@/decorators/http.decorators';
import { Roles } from '@/decorators/role.decorator';
import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UpdateImageReqDto } from '../delivers/dto/update-image.req.dto';

@Controller('users')
export class UsersController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @ApiPublic({
    type: LoginResDto,
    summary: 'Đăng nhập [USER]',
  })
  @Post('login')
  async login(@Body() reqDto: LoginReqDto): Promise<LoginResDto> {
    return await this.authService.loginUser(reqDto);
  }

  @ApiPublic({
    type: LoginResDto,
    summary: 'Đăng nhập [USER]',
  })
  @Post('login/firebase')
  async loginFirebase(@Body('idToken') idToken: string) {
    return this.authService.verifyFirebaseIdToken(idToken);
  }

  @Roles(RoleEnum.MANAGEMENT)
  @ApiAuth({
    summary: 'Tạo mới người dùng (ADMIN, MANAGEMENT)',
    type: UserResDto,
  })
  @Post()
  async create(
    @CurrentUser() payload: JwtPayloadType,
    @Body() reqDto: CreateUserReqDto,
  ): Promise<UserResDto> {
    return await this.usersService.create(reqDto, payload);
  }

  @Roles(RoleEnum.MANAGEMENT)
  @ApiAuth({
    summary: 'Lấy danh sách người dùng [ADMIN]',
    type: UserResDto,
  })
  @Get()
  async getPageUsers(
    @CurrentUser() payload: JwtPayloadType,
    @Query() reqDto: PageUserReqDto,
  ) {
    return await this.usersService.getPageUsers(reqDto, payload);
  }

  @Roles(RoleEnum.MANAGEMENT)
  @ApiAuth({
    summary: 'Khóa/Mở khóa tài khoản người dùng [ADMIN]',
    type: UserResDto,
  })
  @Patch('locked')
  async lockUser(@Body() reqDto: LockUserReqDto): Promise<UserResDto> {
    return await this.usersService.lockUser(reqDto);
  }

  @Roles(RoleEnum.USER)
  @ApiAuth({
    summary: 'Lấy thông tin người dùng khi đăng nhập [USER]',
    type: UserResDto,
  })
  @Get('info')
  async getInfo(@CurrentUser() payload: JwtPayloadType): Promise<UserResDto> {
    return await this.usersService.getUserById(payload.id);
  }

  @Roles(RoleEnum.USER)
  @ApiAuth({
    summary: 'Cập nhật thông tin người dùng [USER]',
    type: UserResDto,
  })
  @Patch()
  async update(
    @CurrentUser() payload: JwtPayloadType,
    @Body() reqDto: UpdateUserReqDto,
  ) {
    return await this.usersService.update(payload, reqDto);
  }

  @Roles(RoleEnum.USER)
  @ApiAuth({
    summary: 'Cập nhật ảnh đại diện người dùng [USER])',
    type: UserResDto,
  })
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
  @Patch('image')
  async updateImage(
    @CurrentUser() payload: JwtPayloadType,
    @Body() _dto: UpdateImageReqDto,
    @UploadedFile() image: Express.Multer.File,
  ) {
    return await this.usersService.updateImage(payload, image);
  }
}
