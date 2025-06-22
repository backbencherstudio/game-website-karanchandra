import { IsString, IsNumber, IsEmail, IsOptional, IsEnum, IsNotEmpty } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export class CreateUpiPaymentDto {
  @IsString({ message: 'name must be a string' })
  @IsNotEmpty({ message: 'name is required' })
  name: string;

  @IsEmail({}, { message: 'email must be a valid email' })
  @IsNotEmpty({ message: 'email is required' })
  email: string;

  @IsString({ message: 'phone must be a string' })
  @IsNotEmpty({ message: 'phone is required' })
  phone: string;

  @IsString({ message: 'address must be a string' })
  @IsNotEmpty({ message: 'address is required' })
  address: string;

  @Type(() => Number)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const num = parseFloat(value);
      return isNaN(num) ? value : num;
    }
    return value;
  })
  @IsNumber({}, { message: 'amount must be a number' })
  amount: number;

  @IsString({ message: 'description must be a string' })
  @IsOptional()
  description?: string;

  @IsString({ message: 'notes must be a string' })
  @IsOptional()
  notes?: string;

  @IsEnum(PaymentStatus)
  @IsOptional()
  status?: PaymentStatus = PaymentStatus.PENDING;
}
