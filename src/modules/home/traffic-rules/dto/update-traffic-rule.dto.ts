import { PartialType } from '@nestjs/swagger';
import { CreateTrafficRuleDto } from './create-traffic-rule.dto';

export class UpdateTrafficRuleDto extends PartialType(CreateTrafficRuleDto) {}
