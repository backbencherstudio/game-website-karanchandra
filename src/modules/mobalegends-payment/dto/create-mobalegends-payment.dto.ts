import { IsString, IsNumber, IsEmail, IsOptional, IsEnum, IsNotEmpty } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export class CreateMobalegendsPaymentDto {
  @Type(() => Number)
  @IsNumber({}, { message: 'amount must be a number' })
  @IsNotEmpty({ message: 'amount is required' })
  amount: number;

  @IsString({ message: 'merchantName must be a string' })
  @IsOptional({ message: 'merchantName is Optional' })
  merchantName: string;

  @IsString()
  @IsOptional()
  upiId?: string;

  @IsString()
  @IsOptional()
  client_txn_id?: string;

  @IsString()
  @IsOptional()
  customerName?: string;

  @IsEmail()
  @IsOptional()
  customerEmail?: string;

  @IsString()
  @IsOptional()
  customerMobile?: string;

  @IsString()
  @IsOptional()
  redirectUrl?: string;

  @IsString()
  @IsOptional()
  pInfo?: string;

  @IsString()
  @IsOptional()
  udf1?: string;

  @IsString()
  @IsOptional()
  udf2?: string;

  @IsString()
  @IsOptional()
  udf3?: string;

  @IsOptional()
  items?: {
    productId: string;
    quantity: number;
  }[];

  @IsString()
  @IsOptional()
  address?: string;

  @IsEnum(PaymentStatus)
  @IsOptional()
  status?: PaymentStatus = PaymentStatus.PENDING;
} 