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

  async updateForProduct(
    productId: number,
    groups: CreateOptionGroupReqDto[],
    tx: Transaction,
  ): Promise<void> {
    const existingGroups = (await tx.query.optionGroups.findMany({
      where: eq(optionGroups.productId, productId),
      with: { options: true },
    })) as ExistingOptionGroupWithOptions[];

    const existingGroupMap = new Map<number, ExistingOptionGroupWithOptions>();
    for (const group of existingGroups) {
      if (typeof group.id === 'number') {
        existingGroupMap.set(group.id, group);
      }
    }

    const processedGroupIds = new Set<number>();

    for (const [groupIndex, groupDto] of groups.entries()) {
      const groupId = typeof groupDto?.id === 'number' ? groupDto.id : undefined;
      let existingGroup: ExistingOptionGroupWithOptions | undefined;

      if (groupId !== undefined) {
        existingGroup = existingGroupMap.get(groupId);
      }

      if (!existingGroup && groupDto.name) {
        existingGroup = existingGroups.find((group) => group.name === groupDto.name);
      }

      if (!existingGroup) {
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
        continue;
      }

      processedGroupIds.add(existingGroup.id);

      const updatePayload: OptionGroupUpdatePayload = {
        id: existingGroup.id,
        productId,
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

      const existingOptionMap = new Map<number, ExistingOptionGroupOption>();
      for (const option of existingGroup.options) {
        if (typeof option.id === 'number') {
          existingOptionMap.set(option.id, option);
        }
      }

      const optionsToInsert: OptionGroupOptionInsertPayload[] = [];
      const optionsToUpdate: OptionGroupOptionUpdatePayload[] = [];

      const incomingOptions = groupDto.options ?? [];
      const processedOptionIds = new Set<number>();

      for (const [optionIndex, optionDto] of incomingOptions.entries()) {
        const optionId = typeof optionDto?.id === 'number' ? optionDto.id : undefined;
        let existingOption: ExistingOptionGroupOption | undefined;

        if (optionId !== undefined) {
          existingOption = existingOptionMap.get(optionId);
        }

        if (!existingOption && optionDto.name) {
          existingOption = existingGroup.options.find((opt) => opt.name === optionDto.name);
        }

        if (!existingOption) {
          optionsToInsert.push({
            optionGroupId: existingGroup.id,
            name: optionDto.name,
            price: optionDto.price,
            orderIndex: optionIndex,
          });
          continue;
        }

        processedOptionIds.add(existingOption.id);

        optionsToUpdate.push({
          id: existingOption.id,
          name: optionDto.name,
          price: optionDto.price,
          orderIndex: optionIndex,
        });
      }

      if (optionsToInsert.length > 0) {
        await tx.insert(optionGroupOptions).values(optionsToInsert).execute();
      }

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

      const optionIdsToDelete = existingGroup.options
        .map((option) => option.id)
        .filter((id): id is number => typeof id === 'number' && !processedOptionIds.has(id));

      if (optionIdsToDelete.length > 0) {
        await tx
          .delete(optionGroupOptions)
          .where(inArray(optionGroupOptions.id, optionIdsToDelete as number[]));
      }
    }

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
