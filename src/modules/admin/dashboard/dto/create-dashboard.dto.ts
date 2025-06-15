import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';



export class CreateDashboardDto {
  @IsString()
  name: string;

  @IsString()
  type: string;

  @IsString()
  category: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Regular price must be a number' })
  regularPrice: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Discount price must be a number' })
  discountPrice?: number;

  // ❌ Remove imageUrl from client-sent data — it's generated on server
  @IsOptional()
  @IsString()
  imageUrl?: string; // ✅ Keep optional to allow merging before saving to DB
}
