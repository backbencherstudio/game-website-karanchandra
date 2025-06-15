import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateUpiPaymentDto, PaymentStatus } from './dto/create-upi-payment.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class UpiPaymentService {
  private readonly ezUpiApiKey: string;
  private readonly ezUpiApiUrl: string;
  private readonly callbackUrl: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.ezUpiApiKey = this.configService.get('EZ_UPI_API_KEY');
    this.ezUpiApiUrl = this.configService.get('EZ_UPI_API_URL') || 'https://ezupi.com/api';
    this.callbackUrl = this.configService.get('CALLBACK_URL');

    if (!this.ezUpiApiKey) {
      throw new Error('EZ_UPI_API_KEY is not configured');
    }
  }

  // Method to create a one-time payment
  async create(createUpiPaymentDto: CreateUpiPaymentDto) {
    try {
      const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const response = await axios.post(
        `${this.ezUpiApiUrl}`,
        {
          amount: createUpiPaymentDto.amount,
          currency: 'INR',
          transaction_id: transactionId,
          description: createUpiPaymentDto.description,
          callback_url: this.callbackUrl,
          customer: {
            name: createUpiPaymentDto.name,
            email: createUpiPaymentDto.email,
            phone: createUpiPaymentDto.phone,
            address: createUpiPaymentDto.address,
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.ezUpiApiKey}`,
            'Content-Type': 'application/json',
          }
        }
      );

      if (!response.data || !response.data.status) {
        throw new BadRequestException(response.data?.message || 'Failed to create payment');
      }

      const { orderId, payment_url } = response.data.result;

      // Save the payment details to the database
      const payment = await this.prisma.payment.create({
        data: {
          order_id: orderId,
          amount: createUpiPaymentDto.amount,
          currency: 'INR',
          status: PaymentStatus.PENDING,
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
          transaction_id: transactionId,
          amount: createUpiPaymentDto.amount,
          currency: 'INR',
          payment_id: payment.id,
          callback_url: this.callbackUrl
        },
        message: 'UPI payment initiated successfully',
      };
    } catch (error) {
      console.error('EZ-UPI Error:', error);
      throw new BadRequestException(
        error.response?.data?.message || error.message || 'Failed to create payment'
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
        where: { order_id: transactionId }
      });

      if (!payment) {
        throw new BadRequestException('Payment not found');
      }

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

      if (status === 'SUCCESS' && payment.status !== PaymentStatus.COMPLETED) {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.COMPLETED }
        });
      }

      return {
        success: true,
        data: {
          status: status === 'SUCCESS' ? PaymentStatus.COMPLETED : payment.status,
          amount: payment.amount,
          currency: payment.currency,
          created_at: payment.created_at
        },
        message: status === 'SUCCESS' ? 'Payment completed' : 'Payment pending'
      };
    } catch (error) {
      throw new BadRequestException(
        error.response?.data?.message || error.message || 'Failed to fetch payment status'
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
