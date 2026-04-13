import { TransformFnParams } from 'class-transformer';

export const normalizeTextTransformer = (params: TransformFnParams): string => params.value?.trim();
