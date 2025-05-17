import { RoleEnum } from '@/database/schemas';
import { Injectable } from '@nestjs/common';

interface IsAuthorizedParams {
  currentRole: RoleEnum;
  requiredRole: RoleEnum;
}

@Injectable()
export class AccessControlService {
  private hierarchies: Array<Map<string, number>> = [];
  private priority: number = 1;

  constructor() {
    this.buildRoles([
      RoleEnum.USER,
      RoleEnum.STORE,
      RoleEnum.MANAGEMENT,
      RoleEnum.ADMIN,
    ]);
    this.buildRoles([RoleEnum.DELIVER, RoleEnum.MANAGEMENT, RoleEnum.ADMIN]);
    this.buildRoles([RoleEnum.STORE, RoleEnum.MANAGEMENT, RoleEnum.ADMIN]);
  }

  private buildRoles(roles: RoleEnum[]) {
    const hierarchy: Map<string, number> = new Map();

    roles.forEach((role) => {
      hierarchy.set(role, this.priority);
      this.priority++;
    });

    this.hierarchies.push(hierarchy);
  }

  public isAuthorized({ currentRole, requiredRole }: IsAuthorizedParams) {
    for (const hierarchy of this.hierarchies) {
      const priority = hierarchy.get(currentRole);
      const requiredPriority = hierarchy.get(requiredRole);

      if (priority && requiredPriority && priority >= requiredPriority) {
        return true;
      }
    }

    return false;
  }

  // public async isInOpenTime() {
  //   const { openTime, closeTime, openFullTime } = (
  //     await this.settingsService.getEnvSettings()
  //   )[0];
  //
  //   const currentHour = new Date().getHours();
  //   if (openFullTime) {
  //     return true;
  //   }
  //
  //   return (
  //     currentHour >= openTime.getHours() && currentHour < closeTime.getHours()
  //   );
  // }
}
