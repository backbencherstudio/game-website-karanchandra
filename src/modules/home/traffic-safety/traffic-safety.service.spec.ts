import { Test, TestingModule } from '@nestjs/testing';
import { TrafficSafetyService } from './traffic-safety.service';

describe('TrafficSafetyService', () => {
  let service: TrafficSafetyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TrafficSafetyService],
    }).compile();

    service = module.get<TrafficSafetyService>(TrafficSafetyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
