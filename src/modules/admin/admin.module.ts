import { Module } from '@nestjs/common';
import { PaymentTransactionModule } from './payment-transaction/payment-transaction.module';
import { UserModule } from './user/user.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    PaymentTransactionModule,
    UserModule,
    DashboardModule,
  ],
})
export class AdminModule {}
