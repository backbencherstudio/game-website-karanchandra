import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Body,
  Param,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ValidationPipe,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { DashboardService } from './dashboard.service';
import { CreateDashboardDto } from './dto/create-dashboard.dto';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import appConfig from 'src/config/app.config';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';
import { UpdateDashboardDto } from './dto/update-dashboard.dto';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Post('/product')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const path = appConfig().storageUrl.rootUrl + appConfig().storageUrl.product;
          if (!existsSync(path)) {
            mkdirSync(path, { recursive: true });
          }
          cb(null, path);
        },
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${file.originalname}`);
        },
      }),
    }),
  )
  async create(
    @Body(new ValidationPipe({ transform: true })) createDashboardDto: CreateDashboardDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    try {
      if (!image) {
        throw new BadRequestException('Image file is required');
      }
      // console.log(image)
      // Generate image URL assuming you serve /uploads publicly
      // const imageUrl = `${appConfig().baseUrl}/uploads/products/${image.filename}`;
      
      const productData = {
        ...createDashboardDto,
        image,
      };

      const result = await this.dashboardService.create(productData);

      return {
        success: true,
        message: 'Product created successfully',
        data: result,
      };
    } catch (error) {
      throw new BadRequestException(error?.message || 'Failed to create product');
    }
  }
  
  @Get('/products')
  async findAll() {
    try {
      const products = await this.dashboardService.findAll();
      return {
        success: true,
        data: products,
        message: 'Products fetched successfully'
      };
    } catch (error) {
      throw new BadRequestException(error?.message || 'Failed to fetch products');
    }
  }

  @Get('/products/:id')
  async findOne(@Param('id') id: string) {
    try {
      const product = await this.dashboardService.findOne(id);
      return {
        success: true,
        data: product,
        message: 'Product fetched successfully'
      };
    } catch (error) {
      throw new BadRequestException(error?.message || 'Failed to fetch product');
    }
  }

  @Delete('/products/:id')
  async remove(@Param('id') id: string) {
    try {
      const result = await this.dashboardService.remove(id);
      return {
        success: true,
        data: result,
        message: 'Product deleted successfully'
      };
    } catch (error) {
      throw new BadRequestException(error?.message || 'Failed to delete product');
    }
  }

  @Patch('/products/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const path = appConfig().storageUrl.rootUrl + appConfig().storageUrl.product;
          if (!existsSync(path)) {
            mkdirSync(path, { recursive: true });
          }
          cb(null, path);
        },
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${file.originalname}`);
        },
      }),
    }),
  )
  async update(
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true })) updateDashboardDto: UpdateDashboardDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    try {
      const result = await this.dashboardService.update(id, updateDashboardDto, image);
      return {
        success: true,
        data: result,
        message: 'Product updated successfully'
      };
    } catch (error) {
      throw new BadRequestException(error?.message || 'Failed to update product');
    }
  }
}
