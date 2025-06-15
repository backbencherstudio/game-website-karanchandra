import { Module } from '@nestjs/common';
import { UpiPaymentService } from './upi-payment.service';
import { UpiPaymentController } from './upi-payment.controller';

@Module({
  controllers: [UpiPaymentController],
  providers: [UpiPaymentService],
})
export class UpiPaymentModule {}
