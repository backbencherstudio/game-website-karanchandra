import { Test, TestingModule } from '@nestjs/testing';
import { TrafficRulesService } from './traffic-rules.service';

describe('TrafficRulesService', () => {
  let service: TrafficRulesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TrafficRulesService],
    }).compile();

    service = module.get<TrafficRulesService>(TrafficRulesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
