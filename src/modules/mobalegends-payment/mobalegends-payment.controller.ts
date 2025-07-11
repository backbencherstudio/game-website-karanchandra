import { Controller, Post, Body, Get, Param, HttpException, HttpStatus, Patch, UseGuards, UseInterceptors, BadRequestException } from '@nestjs/common';
import { MobalegendsPaymentService } from './mobalegends-payment.service';
import { CreateMobalegendsPaymentDto } from './dto/create-mobalegends-payment.dto';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';

@Controller('mobalegends-payment')
export class MobalegendsPaymentController {
  constructor(private readonly mobalegendsPaymentService: MobalegendsPaymentService) {}

  @Post()
  @UseInterceptors(AnyFilesInterceptor())
  async create(@Body() body: CreateMobalegendsPaymentDto) {
    try {
      return await this.mobalegendsPaymentService.create(body);
    } catch (error) {
      // console.error('Error creating payment:', error);
      // console.error('Error response:', error?.response?.data || error?.message);
      throw new BadRequestException(
        error?.response?.data?.message || 'Mobalegends Error',
      );
    }
    
  }

  @Get('status/:transactionId')
  async getPaymentStatus(@Param('transactionId') transactionId: string) {
    try {
      // console.log("transactionId",transactionId)
      return await this.mobalegendsPaymentService.getPaymentStatus(transactionId);
    } catch (error) {
      throw new HttpException(
        error?.message || 'Failed to get payment status',
        error?.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getAllPayments() {
    try {
      const payments = await this.mobalegendsPaymentService.getAllPayments();
      return {
        success: true,
        data: payments,
        message: 'Payments fetched successfully',
      };
    } catch (error) {
      throw new HttpException(
        error?.message || 'Failed to fetch payments',
        error?.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Patch('order-delivery/:orderId')
  async updateOrderDelivery(@Param('orderId') orderId: string) {
    try {
      const updated = await this.mobalegendsPaymentService.updateOrderDelivery(orderId);
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

  @Post('webhook')
  async handleWebhook(@Body() body: any) {
    // verify signature if they supply one
    await this.mobalegendsPaymentService.processWebhook(body);
    return { received: true };
  }
} 