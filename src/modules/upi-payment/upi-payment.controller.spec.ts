import { Test, TestingModule } from '@nestjs/testing';
import { UpiPaymentController } from './upi-payment.controller';
import { UpiPaymentService } from './upi-payment.service';

describe('UpiPaymentController', () => {
  let controller: UpiPaymentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UpiPaymentController],
      providers: [UpiPaymentService],
    }).compile();

    controller = module.get<UpiPaymentController>(UpiPaymentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
