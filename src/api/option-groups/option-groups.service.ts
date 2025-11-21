import { CreateOptionGroupReqDto } from '@/api/option-groups/dto/create-option-group.req.dto';
import {
  ExistingOptionGroupOption,
  ExistingOptionGroupWithOptions,
  OptionGroupInsertPayload,
  OptionGroupOptionInsertPayload,
  OptionGroupOptionUpdatePayload,
  OptionGroupUpdatePayload,
} from '@/api/option-groups/types/option-groups.types';
import { DRIZZLE, Transaction } from '@/database/global';
import { optionGroupOptions, optionGroups } from '@/database/schemas';
import { DrizzleDB } from '@/database/types/drizzle';
import { Inject, Injectable } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';

@Injectable()
export class OptionGroupsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async createForProduct(
    productId: number,
    groups: CreateOptionGroupReqDto[],
    tx: Transaction,
  ): Promise<void> {
    for (const [groupIndex, group] of groups.entries()) {
      const [createdGroup] = await tx
        .insert(optionGroups)
        .values({
          productId,
          name: group.name,
          displayName: group.displayName ?? group.name,
          isRequired: group.isRequired ?? true,
          minSelect: group.minSelect ?? 1,
          maxSelect: group.maxSelect ?? 1,
          orderIndex: group.orderIndex ?? groupIndex,
        })
        .returning({ id: optionGroups.id });

      if (group.options && group.options.length > 0) {
        await tx
          .insert(optionGroupOptions)
          .values(
            group.options.map((option, optionIndex) => ({
              optionGroupId: createdGroup.id,
              name: option.name,
              price: option.price,
              orderIndex: optionIndex,
            })),
          )
          .execute();
      }
    }
  }

  /**
   * Cập nhật option groups cho product theo phương pháp diff-based
   * Logic: So sánh data mới từ FE với data hiện tại trong DB, sau đó:
   * - THÊM: Nếu group/option không tồn tại
   * - SỬA: Nếu group/option đã tồn tại (match theo id hoặc name)
   * - XÓA: Nếu group/option cũ không có trong data mới
   */
  async updateForProduct(
    productId: number,
    groups: CreateOptionGroupReqDto[],
    tx: Transaction,
  ): Promise<void> {
    // Bước 1: Lấy tất cả option groups hiện tại của product từ DB
    const existingGroups = await this.getExistingGroups(productId, tx);

    // Bước 2: Tạo Map để tra cứu nhanh existing groups theo id
    const existingGroupMap = this.buildGroupMap(existingGroups);

    // Bước 3: Set để theo dõi các group đã được xử lý (để biết group nào cần xóa)
    const processedGroupIds = new Set<number>();

    // Bước 4: Duyệt qua từng group từ FE gửi lên
    for (const [groupIndex, groupDto] of groups.entries()) {
      const existingGroup = this.findExistingGroup(groupDto, existingGroupMap, existingGroups);

      // TRƯỜNG HỢP 1: Group chưa tồn tại → THÊM MỚI
      if (!existingGroup) {
        await this.createNewOptionGroup(productId, groupDto, groupIndex, tx);
        continue;
      }

      // TRƯỜNG HỢP 2: Group đã tồn tại → CẬP NHẬT
      processedGroupIds.add(existingGroup.id);
      await this.updateExistingOptionGroup(existingGroup, groupDto, groupIndex, tx);
    }

    // Bước 5: Xóa các groups cũ không còn trong data mới
    await this.deleteUnusedGroups(existingGroups, processedGroupIds, tx);
  }

  /**
   * Lấy tất cả option groups hiện tại của product từ DB
   */
  private async getExistingGroups(
    productId: number,
    tx: Transaction,
  ): Promise<ExistingOptionGroupWithOptions[]> {
    return (await tx.query.optionGroups.findMany({
      where: eq(optionGroups.productId, productId),
      with: { options: true },
    })) as ExistingOptionGroupWithOptions[];
  }

  /**
   * Tạo Map để tra cứu nhanh existing groups theo id
   */
  private buildGroupMap(
    existingGroups: ExistingOptionGroupWithOptions[],
  ): Map<number, ExistingOptionGroupWithOptions> {
    const map = new Map<number, ExistingOptionGroupWithOptions>();
    for (const group of existingGroups) {
      if (typeof group.id === 'number') {
        map.set(group.id, group);
      }
    }
    return map;
  }

  /**
   * Tìm existing group theo id (ưu tiên) hoặc name (fallback)
   */
  private findExistingGroup(
    groupDto: CreateOptionGroupReqDto,
    groupMap: Map<number, ExistingOptionGroupWithOptions>,
    existingGroups: ExistingOptionGroupWithOptions[],
  ): ExistingOptionGroupWithOptions | undefined {
    const groupId = typeof groupDto?.id === 'number' ? groupDto.id : undefined;

    // Tìm theo id (ưu tiên)
    if (groupId !== undefined) {
      const found = groupMap.get(groupId);
      if (found) return found;
    }

    // Fallback: tìm theo name
    if (groupDto.name) {
      return existingGroups.find((group) => group.name === groupDto.name);
    }

    return undefined;
  }

  /**
   * Tạo mới option group và các options của nó
   */
  private async createNewOptionGroup(
    productId: number,
    groupDto: CreateOptionGroupReqDto,
    groupIndex: number,
    tx: Transaction,
  ): Promise<void> {
    const groupInsertPayload: OptionGroupInsertPayload = {
      productId,
      name: groupDto.name,
      displayName: groupDto.displayName ?? groupDto.name,
      isRequired: groupDto.isRequired ?? true,
      minSelect: groupDto.minSelect ?? 1,
      maxSelect: groupDto.maxSelect ?? 1,
      orderIndex: groupDto.orderIndex ?? groupIndex,
    };

    const [createdGroup] = await tx
      .insert(optionGroups)
      .values(groupInsertPayload)
      .returning({ id: optionGroups.id });

    // Thêm các options cho group mới
    const optionsToInsert = groupDto.options ?? [];
    if (optionsToInsert.length > 0) {
      const optionPayloads: OptionGroupOptionInsertPayload[] = optionsToInsert.map(
        (option, optionIndex) => ({
          optionGroupId: createdGroup.id,
          name: option.name,
          price: option.price,
          orderIndex: optionIndex,
        }),
      );
      await tx.insert(optionGroupOptions).values(optionPayloads).execute();
    }
  }

  /**
   * Cập nhật existing option group và xử lý các options của nó
   */
  private async updateExistingOptionGroup(
    existingGroup: ExistingOptionGroupWithOptions,
    groupDto: CreateOptionGroupReqDto,
    groupIndex: number,
    tx: Transaction,
  ): Promise<void> {
    // Cập nhật thông tin của group
    const updatePayload: OptionGroupUpdatePayload = {
      id: existingGroup.id,
      productId: existingGroup.productId,
      name: groupDto.name,
      displayName: groupDto.displayName ?? existingGroup.displayName,
      isRequired: groupDto.isRequired ?? existingGroup.isRequired,
      minSelect: groupDto.minSelect ?? existingGroup.minSelect,
      maxSelect: groupDto.maxSelect ?? existingGroup.maxSelect,
      orderIndex: groupDto.orderIndex ?? groupIndex,
    };

    await tx
      .update(optionGroups)
      .set({
        displayName: updatePayload.displayName,
        isRequired: updatePayload.isRequired,
        minSelect: updatePayload.minSelect,
        maxSelect: updatePayload.maxSelect,
        orderIndex: updatePayload.orderIndex,
      })
      .where(eq(optionGroups.id, existingGroup.id));

    // Xử lý các options của group này
    await this.processGroupOptions(existingGroup, groupDto.options ?? [], tx);
  }

  /**
   * Xử lý options của một group: thêm/sửa/xóa
   */
  private async processGroupOptions(
    existingGroup: ExistingOptionGroupWithOptions,
    incomingOptions: CreateOptionGroupReqDto['options'],
    tx: Transaction,
  ): Promise<void> {
    // Tạo Map để tra cứu nhanh existing options theo id
    const existingOptionMap = new Map<number, ExistingOptionGroupOption>();
    for (const option of existingGroup.options) {
      if (typeof option.id === 'number') {
        existingOptionMap.set(option.id, option);
      }
    }

    const optionsToInsert: OptionGroupOptionInsertPayload[] = [];
    const optionsToUpdate: OptionGroupOptionUpdatePayload[] = [];
    const processedOptionIds = new Set<number>();

    // Duyệt qua từng option từ FE
    for (const [optionIndex, optionDto] of incomingOptions.entries()) {
      const existingOption = this.findExistingOption(
        optionDto,
        existingOptionMap,
        existingGroup.options,
      );

      // Option chưa tồn tại → Thêm vào danh sách INSERT
      if (!existingOption) {
        optionsToInsert.push({
          optionGroupId: existingGroup.id,
          name: optionDto.name,
          price: optionDto.price,
          orderIndex: optionIndex,
        });
        continue;
      }

      // Option đã tồn tại → Đánh dấu đã xử lý và thêm vào danh sách UPDATE
      processedOptionIds.add(existingOption.id);
      optionsToUpdate.push({
        id: existingOption.id,
        name: optionDto.name,
        price: optionDto.price,
        orderIndex: optionIndex,
      });
    }

    // Thực hiện INSERT các options mới
    if (optionsToInsert.length > 0) {
      await tx.insert(optionGroupOptions).values(optionsToInsert).execute();
    }

    // Thực hiện UPDATE các options đã tồn tại
    for (const optionUpdate of optionsToUpdate) {
      await tx
        .update(optionGroupOptions)
        .set({
          name: optionUpdate.name,
          price: optionUpdate.price,
          orderIndex: optionUpdate.orderIndex,
        })
        .where(eq(optionGroupOptions.id, optionUpdate.id));
    }

    // Xóa các options cũ không có trong data mới
    await this.deleteUnusedOptions(existingGroup.options, processedOptionIds, tx);
  }

  /**
   * Tìm existing option theo id (ưu tiên) hoặc name (fallback)
   */
  private findExistingOption(
    optionDto: { id?: number; name: string; price: number },
    optionMap: Map<number, ExistingOptionGroupOption>,
    existingOptions: ExistingOptionGroupOption[],
  ): ExistingOptionGroupOption | undefined {
    const optionId = typeof optionDto?.id === 'number' ? optionDto.id : undefined;

    // Tìm theo id (ưu tiên)
    if (optionId !== undefined) {
      const found = optionMap.get(optionId);
      if (found) return found;
    }

    // Fallback: tìm theo name
    if (optionDto.name) {
      return existingOptions.find((opt) => opt.name === optionDto.name);
    }

    return undefined;
  }

  /**
   * Xóa các options cũ không còn trong data mới
   */
  private async deleteUnusedOptions(
    existingOptions: ExistingOptionGroupOption[],
    processedOptionIds: Set<number>,
    tx: Transaction,
  ): Promise<void> {
    const optionIdsToDelete = existingOptions
      .map((option) => option.id)
      .filter((id): id is number => typeof id === 'number' && !processedOptionIds.has(id));

    if (optionIdsToDelete.length > 0) {
      await tx
        .delete(optionGroupOptions)
        .where(inArray(optionGroupOptions.id, optionIdsToDelete as number[]));
    }
  }

  /**
   * Xóa các groups cũ không còn trong data mới
   */
  private async deleteUnusedGroups(
    existingGroups: ExistingOptionGroupWithOptions[],
    processedGroupIds: Set<number>,
    tx: Transaction,
  ): Promise<void> {
    const groupIdsToDelete = existingGroups
      .map((group) => group.id)
      .filter((id): id is number => typeof id === 'number' && !processedGroupIds.has(id));

    if (groupIdsToDelete.length > 0) {
      await tx.delete(optionGroups).where(inArray(optionGroups.id, groupIdsToDelete as number[]));
    }
  }

  async deleteByProductId(productId: number, tx: Transaction): Promise<void> {
    await tx.delete(optionGroups).where(eq(optionGroups.productId, productId)).execute();
  }
}
