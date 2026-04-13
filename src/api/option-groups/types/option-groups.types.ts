import { optionGroupOptions, optionGroups } from '@/database/schemas';

export type ExistingOptionGroup = typeof optionGroups.$inferSelect;
export type ExistingOptionGroupOption = typeof optionGroupOptions.$inferSelect;
export type ExistingOptionGroupWithOptions = ExistingOptionGroup & {
  options: ExistingOptionGroupOption[];
};

export interface OptionGroupInsertPayload {
  productId: number;
  name: string;
  displayName?: string | null;
  isRequired?: boolean;
  minSelect?: number;
  maxSelect?: number;
  orderIndex?: number;
}

export interface OptionGroupUpdatePayload extends OptionGroupInsertPayload {
  id: number;
}

export interface OptionGroupOptionInsertPayload {
  optionGroupId: number;
  name: string;
  price: number;
  orderIndex: number;
}

export interface OptionGroupOptionUpdatePayload {
  id: number;
  name: string;
  price: number;
  orderIndex: number;
}
