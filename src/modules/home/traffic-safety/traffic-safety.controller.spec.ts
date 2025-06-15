import { Test, TestingModule } from '@nestjs/testing';
import { TrafficSafetyController } from './traffic-safety.controller';
import { TrafficSafetyService } from './traffic-safety.service';

describe('TrafficSafetyController', () => {
  let controller: TrafficSafetyController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrafficSafetyController],
      providers: [TrafficSafetyService],
    }).compile();

    controller = module.get<TrafficSafetyController>(TrafficSafetyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
