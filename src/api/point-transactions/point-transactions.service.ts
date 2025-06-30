import { Injectable } from '@nestjs/common';

@Injectable()
export class PointTransactionsService {
  getLogTransactions() {
    return Promise.resolve(undefined);
  }
}
