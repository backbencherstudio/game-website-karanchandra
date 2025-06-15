import { Test, TestingModule } from '@nestjs/testing';
import { QuizTestController } from './quiz-test.controller';
import { QuizTestService } from './quiz-test.service';

describe('QuizTestController', () => {
  let controller: QuizTestController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuizTestController],
      providers: [QuizTestService],
    }).compile();

    controller = module.get<QuizTestController>(QuizTestController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
