import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateSubscribeDto } from './dto/create-subscribe.dto';
import { UpdateSubscribeDto } from './dto/update-subscribe.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SubscribeService {
  constructor(private prisma: PrismaService) {}

  async create(createSubscribeDto: any) {
    try {
      const { email } = createSubscribeDto;
      
      // Validate email format
      if (!email || !email.includes('@')) {
        throw new BadRequestException('Please provide a valid email address');
      }

      // Check if email already exists
      const existingEmail = await this.prisma.emailSubscription.findFirst({
        where: { email }
      });

      if (existingEmail) {
        throw new BadRequestException('Email already subscribed');
      }

      // Save email to database as a user with type 'subscriber'
      const subscription = await this.prisma.emailSubscription.create({
        data: {
          email,
          // type: 'subscriber',
          // status: 1
        }
      });

      return {
        success: true,
        data: { email: subscription.email, id: subscription.id },
        message: 'Email subscribed successfully'
      };
    } catch (error) {
      // Handle unique constraint error
      if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
        throw new BadRequestException('Email already subscribed');
      }
      
      throw new BadRequestException(
        error?.message || 'Failed to subscribe email'
      );
    }
  }

  async findAll() {
    try {
      const subscriptions = await this.prisma.emailSubscription.findMany({
        where: {
          deleted_at: null
        },
        select: {
          id: true,
          email: true,
          created_at: true
        },
        orderBy: {
          created_at: 'desc'
        }
      });

      return {
        success: true,
        data: subscriptions,
        message: 'All subscribed emails fetched successfully'
      };
    } catch (error) {
      throw new BadRequestException(
        error?.message || 'Failed to fetch subscribed emails'
      );
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} subscribe`;
  }

  update(id: number, updateSubscribeDto: UpdateSubscribeDto) {
    return `This action updates a #${id} subscribe`;
  }

  remove(id: number) {
    return `This action removes a #${id} subscribe`;
  }
}
