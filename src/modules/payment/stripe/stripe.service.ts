import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import Stripe from 'stripe';
import appConfig from '../../../config/app.config';


@Injectable()
export class StripeService {
  private stripe: Stripe;
  private readonly PRODUCT_IDS = {
    month: 'monthly_subscription_product',
    year: 'yearly_subscription_product'
  };

  constructor(private prisma: PrismaService) {
    this.stripe = new Stripe(appConfig().payment.stripe.secret_key, {
      // @ts-ignore - Supporting older API version
      apiVersion: '2023-08-16',
    });
  }

  async createCheckoutSession(priceId: string, userId: string) {
    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      client_reference_id: userId,  // Add this to link the session with the user
      success_url: `${process.env.CLIENT_APP_URL}/about`,
      cancel_url: `${process.env.CLIENT_APP_URL}/subscription`,
    });
  
    return session;
  }

async retrieveCheckoutSession(sessionId: string, options?: Stripe.Checkout.SessionRetrieveParams) {
    return await this.stripe.checkout.sessions.retrieve(sessionId, options);
  }

async createBillingPortalSession(customerId: string) {
  const portalSession = await this.stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.CLIENT_APP_URL}/subcription`,
  });
  return portalSession;
}

async constructWebhookEvent(payload: Buffer, signature: string) {
  try {
    const event = this.stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET_KEY
    );
    return event;
  } catch (err) {
    throw new HttpException(`Webhook Error: ${err.message}`, HttpStatus.BAD_REQUEST);
  }
}

  // Add this new method
  async checkUserSubscription(userId: string) {
    try {
      const subscription = await this.prisma.subscription.findFirst({
        where: {
          user_id: userId,
          status: 'active',
          deleted_at: null,
          current_period_end: {
            gt: new Date()
          }
        }
      });

      return {
        isSubscribed: !!subscription,
        subscription: subscription,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to check subscription status: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
      try {
        
        // Retrieve the subscription details
        const subscription = await this.stripe.subscriptions.retrieve(
          session.subscription as string,
          {
            expand: ['items.data.price.product']
          }
        );
    
        // Create subscription record in database
        await this.prisma.subscription.create({
          data: {
            user_id: session.client_reference_id,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            status: subscription.status,
            plan_type: subscription.items.data[0].price.nickname || 'starter',
            current_period_start: new Date(subscription.current_period_start * 1000),
            current_period_end: new Date(subscription.current_period_end * 1000),
          },
        });
    
      } catch (error) {
        throw new HttpException(
          'Failed to process subscription',
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
    }

  async handleInvoicePaid(invoiceData: {
    customerEmail: string;
    customerId: string;
    amount: number;
    currency: string;
    invoiceUrl: string;
    status: string;
  }) {
    try {
      await this.prisma.paymentTransaction.create({
        data: {
          customer_id: invoiceData.customerId,
          amount: invoiceData.amount,
          currency: invoiceData.currency,
          status: invoiceData.status,
          invoice_url: invoiceData.invoiceUrl,
          type: 'subscription',
          provider: 'stripe'
        },
      });
    } catch (error) {
      throw new HttpException('Failed to process invoice', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async handleInvoicePaymentFailed(invoiceData: {
    customerEmail: string;
    customerId: string;
    amount: number;
    currency: string;
    status: string;
  }) {
    try {
      await this.prisma.paymentTransaction.create({
        data: {
          customer_id: invoiceData.customerId,
          amount: invoiceData.amount,
          currency: invoiceData.currency,
          status: invoiceData.status,
          type: 'subscription',
          provider: 'stripe'
        },
      });

      // Optionally, update subscription status to reflect payment failure
      const subscription = await this.prisma.subscription.findFirst({
        where: { stripe_customer_id: invoiceData.customerId },
      });
      
      if (subscription) {
        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: 'payment_failed' },
        });
      }
    } catch (error) {
      throw new HttpException('Failed to process failed payment', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    try {
      await this.prisma.subscription.update({
        where: {
          stripe_subscription_id: subscription.id,
        },
        data: {
          status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000),
          current_period_end: new Date(subscription.current_period_end * 1000),
        },
      });
    } catch (error) {
      throw new HttpException('Failed to update subscription', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async cancelSubscription(stripeSubscriptionId: string) {
    try {
      // Cancel in Stripe
      await this.stripe.subscriptions.cancel(stripeSubscriptionId);
  
      // Update in database
      await this.prisma.subscription.update({
        where: {
          stripe_subscription_id: stripeSubscriptionId
        },
        data: {
          status: 'cancelled',
          deleted_at: new Date(),
          cancel_at_period_end: true
        }
      });
  
      return {
        success: true,
        message: 'Subscription cancelled successfully'
      };
    } catch (error) {
      throw new HttpException(
        'Failed to cancel subscription: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}