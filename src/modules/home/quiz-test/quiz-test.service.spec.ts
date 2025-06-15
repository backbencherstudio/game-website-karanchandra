import { Test, TestingModule } from '@nestjs/testing';
import { QuizTestService } from './quiz-test.service';

describe('QuizTestService', () => {
  let service: QuizTestService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QuizTestService],
    }).compile();

    service = module.get<QuizTestService>(QuizTestService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
