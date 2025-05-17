import { Controller } from '@nestjs/common';
import { ExtrasService } from './extras.service';

@Controller('extras')
export class ExtrasController {
  constructor(private readonly extrasService: ExtrasService) {}
}
