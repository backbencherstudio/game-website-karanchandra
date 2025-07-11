import { Injectable, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CreateMobalegendsPaymentDto, PaymentStatus } from './dto/create-mobalegends-payment.dto';
// no querystring needed for JSON payload

@Injectable()
export class MobalegendsPaymentService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultRedirectUrl: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('MOBILEGENDS_API_KEY') || process.env.MOBILEGENDS_API_KEY;
    this.baseUrl =
      this.configService.get<string>('MOBILEGENDS_API_URL')      // if set in .env
      || 'https://gateway.mobalegends.in/api';                   // default
    this.defaultRedirectUrl = this.configService.get<string>('SUCCESS_REDIRECT_URL') || 'http://localhost:3000/payment/success';

    if (!this.apiKey) {
      throw new Error('MOBILEGENDS_API_KEY is not configured');
    }
  }

  async create(dto: CreateMobalegendsPaymentDto) {
    const transactionId =
      dto.client_txn_id ||
      `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    // console.log("apiKey",this.apiKey)

    // Ensure amount is numeric for gateway & DB
    const rawAmount = dto.amount;
    const numericAmount =
      typeof rawAmount === 'string' ? parseFloat(rawAmount) : rawAmount;
    if (Number.isNaN(numericAmount)) {
      throw new BadRequestException('amount must be a valid number');
    }

    const payload = {
      apiKey: this.apiKey,
      amount: numericAmount,
      merchantName: dto.merchantName || 'Khemchand Kishinchand Chandani',
      upiId: dto.upiId || 'paytmqr6ie5mh@ptys',
      client_txn_id: transactionId,
      customerName: dto.customerName,
      customerEmail: dto.customerEmail,
      customerMobile: dto.customerMobile,
      redirectUrl: process.env.SUCCESS_REDIRECT_URL || 'http://localhost:3000/payment/success',  // Direct env usage
      pInfo: dto.pInfo || 'Order Payment',
      udf1: dto.udf1,
      udf2: dto.udf2,
      udf3: dto.udf3,
    };
    // console.log("payload",payload)
    try {
      const response = await axios.post(
        `${this.baseUrl}/payments/create`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
      // console.log("response",response)
      if (!response.data || response.data.success !== true) {
        throw new BadRequestException(
          response.data?.message || 'Mobalegends Error',
        );
      }

      const { transactionId: orderId } = response.data.data;

      // Build payment items if provided
      let paymentItemsData = [];
      if (dto.items?.length) {
        const productIds = dto.items.map((item) => item.productId);
        const products = await this.prisma.product.findMany({
          where: { id: { in: productIds } },
        });
        const productMap = new Map(products.map((p) => [p.id, p]));

        paymentItemsData = dto.items.map((item) => {
          const product = productMap.get(item.productId);
          if (!product) {
            throw new BadRequestException('Invalid productId: ' + item.productId);
          }
          return {
            productId: item.productId,
            quantity: item.quantity,
            price: product.discountPrice ?? product.regularPrice,
          };
        });
      }

      await this.prisma.payment.create({
        data: {
          order_id: orderId,
          amount: numericAmount,
          currency: 'INR',
          status: PaymentStatus.PENDING,
          customer_name: dto.customerName || 'Unknown',
          customer_email: dto.customerEmail || 'unknown@example.com',
          customer_phone: dto.customerMobile || '0000000000',
          customer_address: dto.address || 'N/A',
          description: dto.pInfo || 'N/A',
          notes: dto.udf1 || 'N/A',
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
        data: response.data.data,
        message: 'Mobalegends payment initiated successfully',
      };
    } catch (err) {
      // console.error('Mobalegends error body:', err.response?.data);
      throw new BadRequestException(
        err.response?.data?.message || err.message || 'Mobalegends error',
      );
    }
  }

  async getPaymentStatus(transactionId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { order_id: transactionId },
    });

    if (!payment) {
      throw new BadRequestException('Payment not found');
    }

    const response = await axios.get(
      `https://gateway.mobalegends.in/api/payments/status/${transactionId}`,
    );

    if (!response.data) {
      throw new BadRequestException('Invalid response from Mobalegends');
    }

    const status =
      response.data.status ||
      response.data.data?.status ||
      response.data?.status;

    let mappedStatus: PaymentStatus = PaymentStatus.PENDING;
    if (status === 'SUCCESS') {
      mappedStatus = PaymentStatus.COMPLETED;
    } else if (status === 'FAILED' || status === 'CANCELLED') {
      mappedStatus = PaymentStatus.FAILED;
    }

    if (
      mappedStatus === PaymentStatus.COMPLETED &&
      payment.status !== PaymentStatus.COMPLETED
    ) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: mappedStatus },
      });
    }

    return {
      success: true,
      data: {
        status: mappedStatus,
        amount: payment.amount,
        currency: payment.currency,
        created_at: payment.created_at,
        raw_status: status,
      },
      message:
        mappedStatus === PaymentStatus.COMPLETED
          ? 'Payment completed'
          : mappedStatus === PaymentStatus.FAILED
          ? 'Payment failed'
          : 'Payment pending',
    };
  }

  async getAllPayments() {
    return await this.prisma.payment.findMany({
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async updateOrderDelivery(orderId: string) {
    return await this.prisma.payment.update({
      where: { order_id: orderId },
      data: { order_delivery: 'Completed' },
    });
  }

  async processWebhook(payload: any) {
    // Mobalegends is expected to POST something like
    // {
    //   "transactionId": "TXN123456",
    //   "status": "SUCCESS",   // or FAILED / CANCELLED / PENDING / CREATED
    //   "amount": 1000.00,
    //   "utr": "123456789",
    //   ...other fields
    // }
    const { transactionId, status } = payload || {};

    if (!transactionId || !status) {
      // Nothing to do – missing essential data
      return;
    }

    let mappedStatus: PaymentStatus = PaymentStatus.PENDING;
    if (status === 'SUCCESS') mappedStatus = PaymentStatus.COMPLETED;
    else if (status === 'FAILED' || status === 'CANCELLED') mappedStatus = PaymentStatus.FAILED;

    // Update the payment record if it exists and status changed
    await this.prisma.payment.updateMany({
      where: { order_id: transactionId, status: { not: mappedStatus } },
      data: {
        status: mappedStatus,
        utr: payload.utr || undefined,
      },
    });

    return { updated: true };
  }
} 