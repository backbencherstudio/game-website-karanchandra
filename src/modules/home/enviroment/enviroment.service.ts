import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import enviroment from 'src/data/enviroment';

@Injectable()
export class EnviromentService {
  async getQuestionsWithAnswers() {
    try {
      return [...enviroment]
        .sort(() => Math.random() - 0.5)
        .slice(0, 10)
        .map(({ question, options, answer }) => ({
          question,
          options,
          answer
        }));
    } catch (error) {
      throw new HttpException(
        'Failed to generate environment questions',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
