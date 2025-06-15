import { Module } from '@nestjs/common';
import { TrafficSafetyService } from './traffic-safety.service';
import { TrafficSafetyController } from './traffic-safety.controller';

@Module({
  controllers: [TrafficSafetyController],
  providers: [TrafficSafetyService],
})
export class TrafficSafetyModule {}
