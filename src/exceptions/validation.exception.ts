import { ErrorCode } from '@/constants/error-code.constant';
import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * ValidationException used to throw validation errors with a custom error code and message.
 * ErrorCode default is CV000 (Common Validation)
 */
export class ValidationException extends HttpException {
  constructor(
    error: ErrorCode = ErrorCode.CV000,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
    message?: string,
  ) {
    super({ errorCode: error, message, statusCode }, statusCode);
  }
}
