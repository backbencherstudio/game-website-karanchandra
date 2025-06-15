import { Module } from '@nestjs/common';
import { EnviromentService } from './enviroment.service';
import { EnviromentController } from './enviroment.controller';

@Module({
  controllers: [EnviromentController],
  providers: [EnviromentService],
})
export class EnviromentModule {}
