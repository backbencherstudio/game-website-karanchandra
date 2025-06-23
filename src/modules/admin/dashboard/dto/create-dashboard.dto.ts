import { IsString, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDashboardDto {
  @IsString()
  name: string;

  @IsString()
  type: string;

  @IsString()
  category: string;
  
  @IsString()
  games_name: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Regular price must be a number' })
  regularPrice: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Discount price must be a number' })
  discountPrice?: number;
}
