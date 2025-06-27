import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateUpiPaymentDto, PaymentStatus } from './dto/create-upi-payment.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as qs from 'querystring';

@Injectable()
export class UpiPaymentService {
  private readonly ezUpiApiKey: string;
  private readonly ezUpiApiUrl: string;
  private readonly callbackUrl: string;
  private readonly successRedirectUrl: string;
  private readonly failureRedirectUrl: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.ezUpiApiKey = this.configService.get('EZ_UPI_API_KEY');
    this.ezUpiApiUrl = this.configService.get('EZ_UPI_API_URL') || 'https://ezupi.com/api';
    this.callbackUrl = this.configService.get('CALLBACK_URL');
    this.successRedirectUrl = this.configService.get('SUCCESS_REDIRECT_URL') || 'http://localhost:3000/success';
    this.failureRedirectUrl = this.configService.get('FAILURE_REDIRECT_URL') || 'http://localhost:3000/failure';

    if (!this.ezUpiApiKey) {
      throw new Error('EZ_UPI_API_KEY is not configured');
    }
  }



  


  // Method to create a one-time payment
  async create(createUpiPaymentDto: any) {
      const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const payload = qs.stringify({
        customer_name: createUpiPaymentDto.name,
        customer_mobile: createUpiPaymentDto.phone,
        user_token: process.env.EZ_UPI_API_KEY, // or from config
        amount: String(createUpiPaymentDto.amount),
        order_id: transactionId,
        redirect_url: 'https://yourdomain.com/success',
        redirect_url2: 'https://yourdomain.com/failure',
        remark1: createUpiPaymentDto.description || 'Payment from form',
        remark2: createUpiPaymentDto.notes || 'UPI Notes',
      });
    
      const response = await axios.post('https://ezupi.com/api/create-order', payload, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
    
      if (!response.data || response.data.status !== true) {
        throw new BadRequestException(response.data?.message || 'EZ-UPI Error');
      }
  

      const { orderId, payment_url } = response.data.result;
      

      // Fetch all products for the given productIds
      const productIds = createUpiPaymentDto.items.map(item => item.productId);
      const products = await this.prisma.product.findMany({
        where: { id: { in: productIds } }
      });
      const productMap = new Map(products.map(p => [p.id, p]));

      // Build items with price
      const paymentItemsData = createUpiPaymentDto.items.map(item => {
        const product = productMap.get(item.productId);
        if (!product) throw new BadRequestException('Invalid productId: ' + item.productId);
        return {
          productId: item.productId,
          quantity: item.quantity,
          price: product.discountPrice ?? product.regularPrice, // Use discount if available
        };
      });

      // Create payment with items
      const payment = await this.prisma.payment.create({
        data: {
          order_id: orderId || transactionId,
          amount: createUpiPaymentDto.amount,
          currency: 'INR',
          status: 'PENDING',
          customer_name: createUpiPaymentDto.name,
          customer_email: createUpiPaymentDto.email,
          customer_phone: createUpiPaymentDto.phone,
          customer_address: createUpiPaymentDto.address,
          description: createUpiPaymentDto.description,
          notes: createUpiPaymentDto.notes,
          items: {
            create: paymentItemsData,
          },
        },
        include: {
          items: true,
        },
      });

      
    return {
      success: true,
      data: response.data.result,
      message: 'UPI payment initiated successfully',
    };
  }

  // Method to verify the payment status
  async verifyPayment(transactionId: string) {
    try {
      const response = await axios.get(
        `${this.ezUpiApiUrl}/check-order-status`,
        {
          params: {
            user_token: this.ezUpiApiKey,
            order_id: transactionId,
          },
          headers: {
            'Authorization': `Bearer ${this.ezUpiApiKey}`,
          }
        }
      );

      const { status } = response.data.result;

      if (status === 'SUCCESS') {
        const payment = await this.prisma.payment.update({
          where: { order_id: transactionId },
          data: { status: PaymentStatus.COMPLETED },
        });

        return {
          success: true,
          data: payment,
          message: 'Payment verified successfully',
        };
      } else {
        throw new BadRequestException('Payment verification failed');
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      throw new BadRequestException(
        error.response?.data?.message || error.message || 'Failed to verify payment'
      );
    }
  }

  async getPaymentStatus(transactionId: string) {
    try {
      const payment = await this.prisma.payment.findFirst({
        where: { order_id: transactionId },
      });

      console.log('EZ-UPI Status Response:', payment);
      if (!payment) {
        throw new BadRequestException('Payment not found');
      }

      // Proper form-encoded POST request
      const response = await axios.post(
        'https://ezupi.com/api/check-order-status',
        qs.stringify({
          user_token: this.ezUpiApiKey,
          order_id: transactionId,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      console.log('EZ-UPI Status Response:', response.data);

      const { status, result, message } = response.data;

      if (!status || !result) {
        throw new BadRequestException('Invalid response from EZ-UPI');
      }

      const txnStatus = result.txnStatus;

      // Update DB only if success
      if (txnStatus === 'SUCCESS' && payment.status !== PaymentStatus.COMPLETED) {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.COMPLETED,
            utr: result.utr || undefined, // Optional: Save UTR
          },
        });
      }

      return {
        success: true,
        data: {
          status: txnStatus === 'SUCCESS' ? PaymentStatus.COMPLETED : PaymentStatus.PENDING,
          utr: result.utr || null,
          amount: payment.amount,
          currency: payment.currency,
          created_at: payment.created_at,
        },
        message: txnStatus === 'SUCCESS' ? 'Payment completed' : 'Payment pending',
      };
    } catch (error) {
      console.error('Check Payment Status Error:', error);
      throw new BadRequestException(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to check payment status'
      );
    }
  }

  async getAllPayments() {
    try {
      const data = await this.prisma.payment.findMany({
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });
      return data;
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to fetch payments');
    }
  }
}
