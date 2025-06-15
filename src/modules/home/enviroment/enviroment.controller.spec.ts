import { Test, TestingModule } from '@nestjs/testing';
import { EnviromentController } from './enviroment.controller';
import { EnviromentService } from './enviroment.service';

describe('EnviromentController', () => {
  let controller: EnviromentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EnviromentController],
      providers: [EnviromentService],
    }).compile();

    controller = module.get<EnviromentController>(EnviromentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
