import { Controller, Post, Body, Get, UseGuards, Req, HttpException, HttpStatus, Headers, Param } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { TransactionRepository } from '../../../common/repository/transaction/transaction.repository';
import { Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { RawBodyRequest } from '@nestjs/common';
import { StripePayment } from 'src/common/lib/Payment/stripe/StripePayment';

@Controller('payment')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  // check that user subscriber or not
  @ApiOperation({ summary: 'check that user subscriber or not' })
  @Get('subscription/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async checkSubscriptionStatus(@Req() req) {
    // Extract userId from JWT payload
    const userId = req.user.sub || req.user.userId;
    
    if (!userId) {
      throw new HttpException('User ID not found', HttpStatus.UNAUTHORIZED);
    }
    
    return await this.stripeService.checkUserSubscription(userId);
  }

  @Get("test")
  async testRoute() {
    return await StripePayment.testPayout()
    
  }

  @Get('subscribe')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async createSubscriptionCheckout(
    @Query('plan') plan: string | string[],
    @Req() req: Request & { user: { sub?: string, userId?: string } },
  ) {
    try {
      const userId = req.user.sub || req.user.userId;
      
      if (!userId) {
        throw new HttpException('User ID not found', HttpStatus.UNAUTHORIZED);
      }
      const planValue = Array.isArray(plan) ? plan[0] : plan;

      if (!planValue) {
        throw new HttpException('Subscription plan not found', HttpStatus.BAD_REQUEST);
      }

      let priceId: string;
      switch (planValue.toLowerCase()) {
        case 'starter':
          priceId = process.env.STRIPE_STARTER_PLAN;
          break;
        case 'pro':
          priceId = process.env.STRIPE_PRO_PLAN;
          break;
        default:
          throw new HttpException('Invalid subscription plan', HttpStatus.BAD_REQUEST);
      }
      
      const session = await this.stripeService.createCheckoutSession(priceId, req.user.userId);  // Pass userId

      return { url: session.url };
    } catch (error) {
      // throw new HttpException('Failed to create subscription', HttpStatus.BAD_REQUEST);
      throw error;
    }
  }

  @Get('success')
  async handleSuccessfulPayment(
    @Query('session_id') sessionId: string,
    @Res() res: Response
  ) {
    try {
      if (!sessionId) {
        throw new HttpException('Session ID is required', HttpStatus.BAD_REQUEST);
      }

      const session = await this.stripeService.retrieveCheckoutSession(sessionId, {expand:['subscription', 'subscription.plan.product'] });
      return res.send('Subscribed successfully');
    } catch (error) {
      throw new HttpException('Failed to process successful payment', HttpStatus.BAD_REQUEST);
    }                
  }

  @Post('cancel-subscription/:subscriptionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async cancelSubscription(
    @Param('subscriptionId') stripeSubscriptionId: string
  ) {
    try {
      return await this.stripeService.cancelSubscription(stripeSubscriptionId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to cancel subscription',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('customers/:customerId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async createCustomerPortalSession(
    @Param('customerId') customerId: string,
    @Res() res: Response
  ) {
    try {
      const portalSession = await this.stripeService.createBillingPortalSession(customerId);
      return res.redirect(portalSession.url);
    } catch (error) {
      throw new HttpException(
        'Failed to create customer portal session',
        HttpStatus.BAD_REQUEST
      );
    }
  }


  @Post('webhook')
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response
  ) {
    try {
      const event = await this.stripeService.constructWebhookEvent(req.rawBody, signature);
  
      switch (event.type) {
        case 'checkout.session.completed':
          const checkoutSession = event.data.object;
          await this.stripeService.handleCheckoutSessionCompleted(checkoutSession);
          break;
  
        case 'invoice.paid':
          const paidInvoice = event.data.object;
          await this.stripeService.handleInvoicePaid({
            customerEmail: paidInvoice.customer_email,
            customerId: typeof paidInvoice.customer === 'string' 
              ? paidInvoice.customer 
              : paidInvoice.customer.id,
            amount: paidInvoice.amount_paid,
            currency: paidInvoice.currency,
            invoiceUrl: paidInvoice.invoice_pdf,
            status: 'succeeded'
          });
          break;
  
        case 'customer.subscription.updated':
          const subscription = event.data.object;
          await this.stripeService.handleSubscriptionUpdated(subscription);
          break;
  
        case 'invoice.payment_failed':
          const failedInvoice = event.data.object;
          await this.stripeService.handleInvoicePaymentFailed({
            customerEmail: failedInvoice.customer_email,
            customerId: typeof failedInvoice.customer === 'string' 
              ? failedInvoice.customer 
              : failedInvoice.customer.id,
            amount: failedInvoice.amount_due,
            currency: failedInvoice.currency,
            status: 'failed'
          });
          break;
      }
  
      return res.json({ received: true });
    } catch (error) {
      throw new HttpException(
        `Webhook Error: ${error.message}`,
        HttpStatus.BAD_REQUEST
      );
    }
  }
}
