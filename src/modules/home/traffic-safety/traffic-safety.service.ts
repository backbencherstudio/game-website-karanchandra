import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import trafficSafety from 'src/data/trafficSafety';

@Injectable()
export class TrafficSafetyService {
  private currentTrafficQuestions = null;

  async getQuestions() {
    try {
      // Store the shuffled questions for later verification
      this.currentTrafficQuestions = [...trafficSafety]
        .sort(() => Math.random() - 0.5)
        .slice(0, 10);

      // Return only questions and options to user (not answers)
      return this.currentTrafficQuestions.map(({ question, options }) => ({
        question,
        options,
      }));
    } catch (error) {
      throw new HttpException(
        'Failed to generate traffic safety questions',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getQuestionsWithAnswers() {
    try {
      return [...trafficSafety]
        .sort(() => Math.random() - 0.5)
        .slice(0, 10)
        .map(({ question, options, answer }) => ({
          question,
          options,
          answer
        }));
    } catch (error) {
      throw new HttpException(
        'Failed to generate traffic safety questions',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async calculateResults(userAnswers: string[]) {
    try {
      if (!this.currentTrafficQuestions || !this.currentTrafficQuestions.length) {
        throw new HttpException(
          'Please get questions first before submitting answers',
          HttpStatus.BAD_REQUEST
        );
      }

      if (!Array.isArray(userAnswers)) {
        throw new HttpException(
          'Invalid answers format',
          HttpStatus.BAD_REQUEST
        );
      }

      const correctAnswers = this.currentTrafficQuestions.map(q => q.answer);
      let correctCount = 0;
      let incorrectCount = 0;

      const detailedResults = correctAnswers.map((answer, index) => {
        const userAnswer = userAnswers[index];
        const isCorrect = userAnswer?.toLowerCase() === answer.toLowerCase();
        
        if (userAnswer !== undefined) {
          if (isCorrect) correctCount++;
          else incorrectCount++;
        }

        return {
          questionNumber: index + 1,
          correctAnswer: answer,
          userAnswer: userAnswer || 'skipped',
          isCorrect: isCorrect
        };
      });

      const totalAnswered = correctCount + incorrectCount;
      const percentageScore = (correctCount / totalAnswered) * 100;

      // Clear the stored questions after calculation
      this.currentTrafficQuestions = null;

      return {
        success: true,
        correctCount,
        incorrectCount,
        totalQuestions: 10,
        percentageScore: Math.round(percentageScore),
        skippedQuestions: 10 - totalAnswered,
        detailedResults
      };
    } catch (error) {
      console.error('Calculate Results Error:', error);
      throw new HttpException(
        error.message || 'Failed to calculate results',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
