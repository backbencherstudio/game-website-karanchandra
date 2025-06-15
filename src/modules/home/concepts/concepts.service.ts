import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import conceptsQuestion from 'src/data/concepts';

@Injectable()
export class ConceptsService {
  async getQuestionsWithAnswers() {
    try {
      return [...conceptsQuestion]
        .sort(() => Math.random() - 0.5)
        .slice(0, 10)
        .map(({ question, options, answer }) => ({
          question,
          options,
          answer
        }));
    } catch (error) {
      throw new HttpException(
        'Failed to generate concepts questions',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
