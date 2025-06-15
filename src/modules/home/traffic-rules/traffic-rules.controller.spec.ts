import { Test, TestingModule } from '@nestjs/testing';
import { TrafficRulesController } from './traffic-rules.controller';
import { TrafficRulesService } from './traffic-rules.service';

describe('TrafficRulesController', () => {
  let controller: TrafficRulesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrafficRulesController],
      providers: [TrafficRulesService],
    }).compile();

    controller = module.get<TrafficRulesController>(TrafficRulesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
