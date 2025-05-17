import { AllConfigType } from '@/config/config.type';
import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface DistanceInfo {
  text: string;
  value: number;
}

interface Element {
  status: string;
  duration: DistanceInfo;
  distance: DistanceInfo;
}

export interface Row {
  elements: Element[];
}

export interface DistanceMatrixResponse {
  rows: Row[];
}

export type DistanceMatrixParams = {
  origins: string;
  destinations: string;
  vehicle: VehicleType | string;
};

export enum VehicleType {
  BIKE = 'bike',
  CAR = 'car',
  TRUCK = 'truck',
  Taxi = 'taxi',
}

@Injectable()
export class GoongService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  async getDistanceMatrix({
    origins,
    vehicle,
    destinations,
  }: DistanceMatrixParams): Promise<DistanceMatrixResponse> {
    const response = await this.httpService.axiosRef.get(
      `${this.configService.get('goong.apiUrl', { infer: true })}/DistanceMatrix`,
      {
        params: {
          origins,
          destinations,
          vehicle: vehicle ?? VehicleType.BIKE,
          api_key: this.configService.get('goong.apiKey', {
            infer: true,
          }),
        },
      },
    );
    return response.data;
  }
}
