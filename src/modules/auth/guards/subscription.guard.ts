import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { StripeService } from '../../payment/stripe/stripe.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private stripeService: StripeService,
    private prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId || request.user?.sub;

    if (!userId) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    // Check if user is admin
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { type: true }
    });

    // Allow access if user is admin
    if (user?.type === 'admin') {
      return true;
    }

    // Check subscription for non-admin users
    const subscriptionStatus = await this.stripeService.checkUserSubscription(userId);
    if (!subscriptionStatus.isSubscribed) {
      throw new HttpException('Active subscription required', HttpStatus.PAYMENT_REQUIRED);
    }

    return true;
  }
}