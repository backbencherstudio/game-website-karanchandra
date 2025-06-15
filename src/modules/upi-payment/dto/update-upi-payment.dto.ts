import { PartialType } from '@nestjs/swagger';
import { CreateUpiPaymentDto } from './create-upi-payment.dto';

export class UpdateUpiPaymentDto extends PartialType(CreateUpiPaymentDto) {}
