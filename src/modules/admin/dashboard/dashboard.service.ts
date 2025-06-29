import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateDashboardDto } from './dto/create-dashboard.dto';
import { UpdateDashboardDto } from './dto/update-dashboard.dto';
import { ConfigService } from '@nestjs/config';
import appConfig from 'src/config/app.config';

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService
  ) {}

  async create(createDashboardDto: CreateDashboardDto & { image?: Express.Multer.File }) {
    try {
      const image = createDashboardDto.image 
        ? `${createDashboardDto.image.filename}`
        : null;

      const product = await this.prisma.product.create({
        data: {
          name: createDashboardDto.name,
          type: createDashboardDto.type,
          category: createDashboardDto.category,
          regularPrice: createDashboardDto.regularPrice,
          discountPrice: createDashboardDto.discountPrice,
          games_name: createDashboardDto.games_name,
          image,
        },
      });
      return {
        success: true,
        data: product,
        message: 'Product created successfully'
      };
    } catch (error) {
      throw new BadRequestException(
        error?.message || 'Failed to create product'
      );
    }
  }

  async findAll() {
    try {
      const products = await this.prisma.product.findMany({
        where: {
          deleted_at: null
        },
        orderBy: {
          created_at: 'desc'
        }
      });

      // Map products and construct image URLs
      const mappedProducts = products.map(product => ({
        ...product,
        imageUrl: product.image 
          ? `${process.env.BACKEND_APP_URL}/storage/product/${product.image}`
          : null
      }));

      return mappedProducts;
    } catch (error) {
      throw new BadRequestException(
        error?.message || 'Failed to fetch products'
      );
    }
  }

  async findOne(id: string) {
    try {
      const product = await this.prisma.product.findFirst({
        where: {
          id,
          deleted_at: null
        }
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      return {
        ...product,
        imageUrl: product.image 
          ? `${process.env.BACKEND_APP_URL}/storage/product/${product.image}`
          : null
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        error?.message || 'Failed to fetch product'
      );
    }
  }

  async remove(id: string) {
    try {
      // First check if product exists
      const product = await this.prisma.product.findFirst({
        where: {
          id,
          deleted_at: null
        }
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      // Soft delete the product
      const deletedProduct = await this.prisma.product.update({
        where: { id },
        data: { 
          deleted_at: new Date()
        }
      });

      return deletedProduct;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        error?.message || 'Failed to delete product'
      );
    }
  }

  async update(id: string, updateDashboardDto: UpdateDashboardDto, image?: Express.Multer.File) {
    try {
      // First check if product exists
      const product = await this.prisma.product.findFirst({
        where: {
          id,
          deleted_at: null
        }
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      // Prepare update data
      const updateData: any = { ...updateDashboardDto };

      // If new image is uploaded, update the image field
      if (image) {
        updateData.image = image.filename;
      }

      // Update the product
      const updatedProduct = await this.prisma.product.update({
        where: { id },
        data: updateData
      });

      return updatedProduct;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        error?.message || 'Failed to update product'
      );
    }
  }

  async getSuccessfulPayments({
    page = 1,
    limit = 10,
  }: {
    page: number;
    limit: number;
  }) {
    try {
      const skip = (page - 1) * limit;

      const [total, payments] = await Promise.all([
        this.prisma.payment.count({
          where: {
            status: 'completed',
            deleted_at: null
          }
        }),
        this.prisma.payment.findMany({
          where: {
            status: 'completed',
            deleted_at: null
          },
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
      throw new BadRequestException(
        error?.message || 'Failed to fetch successful payments'
      );
    }
  }
}
