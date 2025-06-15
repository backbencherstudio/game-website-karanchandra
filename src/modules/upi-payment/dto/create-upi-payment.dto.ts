import { IsString, IsNumber, IsEmail, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export class CreateUpiPaymentDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  phone: string;

  @IsString()
  address: string;

  @Type(() => Number)
  @IsNumber()
  amount: number;

  @IsString()
  @IsOptional()
  description: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsEnum(PaymentStatus)
  @IsOptional()
  status?: PaymentStatus = PaymentStatus.PENDING;
}
