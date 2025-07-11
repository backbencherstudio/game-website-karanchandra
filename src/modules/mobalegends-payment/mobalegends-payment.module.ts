import { Module } from '@nestjs/common';
import { MobalegendsPaymentController } from './mobalegends-payment.controller';
import { MobalegendsPaymentService } from './mobalegends-payment.service';

@Module({
  controllers: [MobalegendsPaymentController],
  providers: [MobalegendsPaymentService],
})
export class MobalegendsPaymentModule {} 