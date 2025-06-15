import { Test, TestingModule } from '@nestjs/testing';
import { UpiPaymentService } from './upi-payment.service';

describe('UpiPaymentService', () => {
  let service: UpiPaymentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UpiPaymentService],
    }).compile();

    service = module.get<UpiPaymentService>(UpiPaymentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
