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
    try {
      const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const payload = qs.stringify({
        customer_name: createUpiPaymentDto.name,
        customer_mobile: createUpiPaymentDto.phone,
        user_token: this.ezUpiApiKey, // From env
        amount: String(createUpiPaymentDto.amount),
        order_id: transactionId,
        redirect_url: this.successRedirectUrl,
        redirect_url2: this.failureRedirectUrl,
        remark1: createUpiPaymentDto.description || 'Payment from form',
        remark2: createUpiPaymentDto.notes || 'UPI Notes',
      });
      
      const response = await axios.post(`${this.ezUpiApiUrl}`, payload, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      if (!response.data || response.data.status === false) {
        throw new BadRequestException(response.data?.message || 'EZ-UPI Error');
      }

      const { orderId, payment_url } = response.data.result;
    

      // Save to DB
      const payment = await this.prisma.payment.create({
        data: {
          order_id: orderId || transactionId, // Use orderId from response or transactionId as fallback
          amount: createUpiPaymentDto.amount,
          currency: 'INR',
          status: 'PENDING',
          customer_name: createUpiPaymentDto.name,
          customer_email: createUpiPaymentDto.email,
          customer_phone: createUpiPaymentDto.phone,
          customer_address: createUpiPaymentDto.address,
          description: createUpiPaymentDto.description,
          notes: createUpiPaymentDto.notes,
        },
      });

      return {
        success: true,
        data: {
          payment_url: payment_url,
          transaction_id: orderId,
          payment_id: payment.id,
        },
        message: 'UPI payment initiated successfully',
      };
    } catch (error) {
      console.error('EZ-UPI Error:', error);
      throw new BadRequestException(
        error?.response?.data?.message || error.message || 'UPI Payment failed',
      );
    }
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

  async getAllPayments({
    page = 1,
    limit = 10,
    status,
    startDate,
    endDate,
  }: {
    page: number;
    limit: number;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) {
    try {
      const skip = (page - 1) * limit;
      const where: any = {};

      if (status) {
        where.status = status;
      }

      if (startDate || endDate) {
        where.created_at = {};
        if (startDate) where.created_at.gte = new Date(startDate);
        if (endDate) where.created_at.lte = new Date(endDate);
      }

      const [total, payments] = await Promise.all([
        this.prisma.payment.count({ where }),
        this.prisma.payment.findMany({
          where,
          skip,
          take: limit,
          orderBy: { created_at: 'desc' }
        })
      ]);

      return {
        payments,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to fetch payments');
    }
  }
}
