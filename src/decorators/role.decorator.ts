import { ROLE_KEY } from '@/constants/app.constant';
import { RoleEnum } from '@/database/schemas';
import { SetMetadata } from '@nestjs/common';

export const Roles = (...role: RoleEnum[]) => SetMetadata(ROLE_KEY, role);
