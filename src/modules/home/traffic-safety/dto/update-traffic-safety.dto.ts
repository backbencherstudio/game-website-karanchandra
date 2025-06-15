import { PartialType } from '@nestjs/swagger';
import { CreateTrafficSafetyDto } from './create-traffic-safety.dto';

export class UpdateTrafficSafetyDto extends PartialType(CreateTrafficSafetyDto) {}
