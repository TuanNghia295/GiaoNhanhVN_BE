import { extras } from '@/database/schemas';

export type ExistingExtra = typeof extras.$inferSelect;

export interface ExtraInsertPayload {
  name: string;
  price: number;
  productId: number;
}

export interface ExtraUpdatePayload {
  id: number;
  name: string;
  price: number;
}
