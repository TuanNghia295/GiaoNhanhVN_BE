import { RoleEnum } from '@/database/schemas';

export type JwtPayloadType = {
  id: number;
  role: RoleEnum;
  areaId?: number;
  sessionId: string;
  iat: number;
  exp: number;
};
