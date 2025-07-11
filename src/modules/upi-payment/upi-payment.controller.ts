import { Controller, Post, Body, Get, Param, Query, HttpException, HttpStatus, BadRequestException, UseGuards, UseInterceptors, Patch } from '@nestjs/common';
import { UpiPaymentService } from './upi-payment.service';
import { CreateUpiPaymentDto } from './dto/create-upi-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Role } from 'src/common/guard/role/role.enum';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { AnyFilesInterceptor } from '@nestjs/platform-express';

@Controller('upi-payment')
export class UpiPaymentController {
  constructor(private readonly upiPaymentService: UpiPaymentService) {}

  // Endpoint to create a one-time payment
  @Post()
  @UseInterceptors(AnyFilesInterceptor())
  
  async create(@Body() body: any) {
    try {
      
      // Validate required fields
      if (!body.name || typeof body.name !== 'string') {
        throw new BadRequestException('name must be a string');
      }
      
      if (!body.email || !body.email.includes('@')) {
        throw new BadRequestException('email must be a valid email');
      }
      
      if (!body.phone || typeof body.phone !== 'string') {
        throw new BadRequestException('phone must be a string');
      }
      
      if (!body.address || typeof body.address !== 'string') {
        throw new BadRequestException('address must be a string');
      }
      
      // Convert and validate amount
      const amount = Number(body.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new BadRequestException('amount must be a positive number');
      }

      
      // Create the payment data object
      const paymentData = {
        name: body.name,
        email: body.email,
        phone: body.phone,
        address: body.address,
        amount: amount,
        items: body.items,
        description: body.description || 'Payment via form submission',
        notes: body.notes || 'Payment initiated from form endpoint'
      };
      console.log("paymentData",paymentData)
      return await this.upiPaymentService.create(paymentData);
      // return {
      //   "success": true,
      //   "data": {
      //     "payment_url": "https://ezupi.com/payment3/instant-pay/ac2d007d468467cc4c89817a2224d0626a6cdd6eacb7e99e868cf5532c0e5753",
      //     "transaction_id": "TXN_1750575930606_pr7rv71",
      //     "payment_id": "cmc7bpmrt0000tzz4numbekjr"
      //   },
      //   "message": "UPI payment initiated successfully"
      // }
    } catch (error) {
      console.error('Payment creation error:', error);
      throw new HttpException(
        error?.message || 'Failed to create UPI payment',
        error?.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Endpoint for handling callback after payment (called by the UPI gateway)
  @Get('callback')
  async handleCallback(
    @Query('transaction_id') transactionId: string,
    @Query('status') status: string,
  ) {
    try {
      if (status !== 'success') {
        throw new BadRequestException('Payment failed');
      }
      return await this.upiPaymentService.verifyPayment(transactionId);
    } catch (error) {
      throw new HttpException(
        error?.message || 'Failed to verify payment',
        error?.status || HttpStatus.BAD_REQUEST
      );
    }
  }

  // Endpoint to check the status of a specific payment using transaction ID
  @Get('status/:transactionId')
  async getPaymentStatus(@Param('transactionId') transactionId: string) {
    try {
      return await this.upiPaymentService.getPaymentStatus(transactionId);
    } catch (error) {
      throw new HttpException(
        error?.message || 'Failed to get payment status',
        error?.status || HttpStatus.BAD_REQUEST
      );
    }
  }

  // Endpoint for admin to fetch all payments (restricted to admins)
  @Get('all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getAllPayments(
  ) {
    try {
      const payments = await this.upiPaymentService.getAllPayments();

      return {
        success: true,
        data: payments,
        message: 'Payments fetched successfully',
      };
    } catch (error) {
      throw new HttpException(
        error?.message || 'Failed to fetch payments',
        error?.status || HttpStatus.BAD_REQUEST
      );
    }
  }

  @Patch('order-delivery/:orderId')
  async updateOrderDelivery(@Param('orderId') orderId: string) {
    try {
      const updated = await this.upiPaymentService.updateOrderDelivery(orderId);
      return {
        success: true,
        data: updated,
        message: 'Order delivery status updated to Completed',
      };
    } catch (error) {
      throw new HttpException(
        error?.message || 'Failed to update order delivery',
        error?.status || HttpStatus.BAD_REQUEST,
      );
    }
  }
}
