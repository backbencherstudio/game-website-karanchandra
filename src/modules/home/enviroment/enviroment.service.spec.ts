import { Test, TestingModule } from '@nestjs/testing';
import { EnviromentService } from './enviroment.service';

describe('EnviromentService', () => {
  let service: EnviromentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EnviromentService],
    }).compile();

    service = module.get<EnviromentService>(EnviromentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
