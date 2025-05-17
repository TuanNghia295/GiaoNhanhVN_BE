import { AuthService } from '@/api/auth/auth.service';
import { LoginResDto } from '@/api/auth/dto/login.res.dto';
import { JwtPayloadType } from '@/api/auth/types/jwt-payload.type';
import { CreateManagerReqDto } from '@/api/managers/dto/create-manager.req.dto';
import { LoginManagerReqDto } from '@/api/managers/dto/login-manager.req.dto';
import { ManagerResDto } from '@/api/managers/dto/manager.res.dto';
import { PageManagerReqDto } from '@/api/managers/dto/page-manager.req.dto';
import { OffsetPaginatedDto } from '@/common/dto/offset-pagination/paginated.dto';
import { RoleEnum } from '@/database/schemas';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { ApiAuth, ApiPublic } from '@/decorators/http.decorators';
import { Roles } from '@/decorators/role.decorator';
import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ManagersService } from './managers.service';

@Controller('managers')
export class ManagersController {
  constructor(
    private readonly authService: AuthService,
    private readonly managersService: ManagersService,
  ) {}

  @ApiPublic({
    summary: 'Đăng nhập dành cho quản lý',
    type: LoginResDto,
  })
  @Post('login')
  async login(@Body() reqDto: LoginManagerReqDto): Promise<LoginResDto> {
    return await this.authService.loginManager(reqDto);
  }

  @Roles(RoleEnum.MANAGEMENT)
  @ApiAuth({
    summary: 'Lấy thông tin của manager hiện tại',
    type: ManagerResDto,
  })
  @Get('info')
  async getInfoManager(
    @CurrentUser() { id: managerId }: JwtPayloadType,
  ): Promise<ManagerResDto> {
    return await this.managersService.getInfo(managerId);
  }

  @Roles(RoleEnum.ADMIN)
  @ApiPublic({
    summary: 'Đăng ký quản lý khu vực mới',
    type: LoginResDto,
  })
  @Post('create-manager')
  async createManager(@Body() dto: CreateManagerReqDto): Promise<LoginResDto> {
    return await this.managersService.create(dto);
  }

  @Roles(RoleEnum.ADMIN)
  @ApiAuth({
    summary: 'Lấy danh sách quản lý khu vực [ADMIN]',
    type: ManagerResDto,
    isPaginated: true,
  })
  @Get()
  async getPageManagers(
    @Query() reqDto: PageManagerReqDto,
  ): Promise<OffsetPaginatedDto<ManagerResDto>> {
    return await this.managersService.getPageManagers(reqDto);
  }
}
