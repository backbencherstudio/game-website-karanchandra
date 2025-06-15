import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import trafficRules from 'src/data/trafficRules';

@Injectable()
export class TrafficRulesService {
  async getQuestionsWithAnswers() {
    try {
      return [...trafficRules]
        .sort(() => Math.random() - 0.5)
        .slice(0, 10)
        .map(({ question, options, answer }) => ({
          question,
          options,
          answer
        }));
    } catch (error) {
      throw new HttpException(
        'Failed to generate traffic rules questions',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
