import { Transform, TransformFnParams } from 'class-transformer';

/**
 * @description Trim spaces from start and end, replace multiple spaces with one.
 *
 * @returns PropertyDecorator
 */
export function Trim(): PropertyDecorator {
  return Transform(({ value }: TransformFnParams) => {
    if (typeof value === 'string') {
      return value.trim().replace(/\s\s+/g, ' ');
    }

    if (Array.isArray(value) && value.every((v) => typeof v === 'string')) {
      return value.map((v) => v.trim().replace(/\s\s+/g, ' '));
    }

    return value; // Safely return non-string values as is
  });
}

/**
 * @description Converts string values 'true'/'false' to boolean true/false.
 * Leaves other values unchanged.
 *
 * @returns PropertyDecorator
 */
export function ToBoolean(): PropertyDecorator {
  return Transform(({ value }: TransformFnParams) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value; // Safely return non-string values as is
  });
}

/**
 * @description Converts string or array of strings to lowercase.
 *
 * @returns PropertyDecorator
 */
export function ToLowerCase(): PropertyDecorator {
  return Transform(({ value }: TransformFnParams) => {
    if (typeof value === 'string') {
      return value.toLowerCase();
    }

    if (Array.isArray(value) && value.every((v) => typeof v === 'string')) {
      return value.map((v) => v.toLowerCase());
    }

    return value; // Safely return non-string values as is
  });
}

/**
 * @description Converts string or array of strings to uppercase.
 *
 * @returns PropertyDecorator
 */
export function ToUpperCase(): PropertyDecorator {
  return Transform(({ value }: TransformFnParams) => {
    if (typeof value === 'string') {
      return value.toUpperCase();
    }

    if (Array.isArray(value) && value.every((v) => typeof v === 'string')) {
      return value.map((v) => v.toUpperCase());
    }

    return value; // Safely return non-string values as is
  });
}
