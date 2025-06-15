import { Module } from '@nestjs/common';
import { TrafficRulesController } from './traffic-rules.controller';
import { TrafficRulesService } from './traffic-rules.service';
import { SubscriptionGuard } from 'src/modules/auth/guards/subscription.guard';
import { PrismaService } from 'src/prisma/prisma.service';
import { StripeService } from 'src/modules/payment/stripe/stripe.service';

@Module({
  controllers: [TrafficRulesController],
  providers: [
    TrafficRulesService,
    SubscriptionGuard,
    PrismaService,
    StripeService
  ]
})
export class TrafficRulesModule {}
