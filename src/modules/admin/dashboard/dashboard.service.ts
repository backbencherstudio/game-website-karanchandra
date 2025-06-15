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
      const imageUrl = createDashboardDto.image 
        ? `${appConfig().storageUrl.rootUrlPublic}${appConfig().storageUrl.product}${createDashboardDto.image.filename}`
        : null;

      const product = await this.prisma.product.create({
        data: {
          name: createDashboardDto.name,
          type: createDashboardDto.type,
          category: createDashboardDto.category,
          regularPrice: createDashboardDto.regularPrice,
          discountPrice: createDashboardDto.discountPrice,
          imageUrl,
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

      return products;
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

      return product;
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

      // If new image is uploaded, update the imageUrl
      if (image) {
        updateData.imageUrl = `${appConfig().app.url}${appConfig().storageUrl.rootUrlPublic}${appConfig().storageUrl.product}${image.filename}`;
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
}
