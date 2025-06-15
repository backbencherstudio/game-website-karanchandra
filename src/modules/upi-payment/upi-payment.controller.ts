import { Controller, Post, Body, Get, Param, Query, HttpException, HttpStatus, BadRequestException, UseGuards } from '@nestjs/common';
import { UpiPaymentService } from './upi-payment.service';
import { CreateUpiPaymentDto } from './dto/create-upi-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Role } from 'src/common/guard/role/role.enum';
import { Roles } from 'src/common/guard/role/roles.decorator';

@Controller('upi-payment')
export class UpiPaymentController {
  constructor(private readonly upiPaymentService: UpiPaymentService) {}

  // Endpoint to create a one-time payment
  @Post()
  async create(@Body() createUpiPaymentDto: CreateUpiPaymentDto) {
    try {
      return await this.upiPaymentService.create(createUpiPaymentDto);
    } catch (error) {
      throw new HttpException(
        error?.message || 'Failed to create UPI payment',
        error?.status || HttpStatus.BAD_REQUEST
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
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    try {
      const payments = await this.upiPaymentService.getAllPayments({
        page,
        limit,
        status,
        startDate,
        endDate,
      });

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
}
