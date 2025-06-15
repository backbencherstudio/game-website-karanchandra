import { PartialType } from '@nestjs/swagger';
import { CreateEnviromentDto } from './create-enviroment.dto';

export class UpdateEnviromentDto extends PartialType(CreateEnviromentDto) {}
