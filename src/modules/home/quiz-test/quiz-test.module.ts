import { Module } from '@nestjs/common';
import { QuizTestService } from './quiz-test.service';
import { QuizTestController } from './quiz-test.controller';

@Module({
  controllers: [QuizTestController],
  providers: [QuizTestService],
})
export class QuizTestModule {}
