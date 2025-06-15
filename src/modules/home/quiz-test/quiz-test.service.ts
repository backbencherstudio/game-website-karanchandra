import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { CreateQuizTestDto } from './dto/create-quiz-test.dto';
import generalQuestion from 'src/data/generalQuestion';

@Injectable()
export class QuizTestService {
  private currentQuizQuestions = null;

  create(createQuizTestDto: CreateQuizTestDto) {
    return 'This action adds a new quizTest';
  }

  async getQuestionByFIlter() {
    try {
      // Store the shuffled questions for later verification
      this.currentQuizQuestions = [...generalQuestion]
        .sort(() => Math.random() - 0.5)
        .slice(0, 40);

      // Return only questions and options to user (not answers)
      return this.currentQuizQuestions.map(({ question, options }) => ({
        question,
        options,
      }));
    } catch (error) {
      throw new HttpException(
        'Failed to generate questions',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async calculateResults(userAnswers: string[]) {
    try {
      if (!this.currentQuizQuestions) {
        throw new HttpException(
          'No active quiz session found',
          HttpStatus.BAD_REQUEST
        );
      }

      const correctAnswers = this.currentQuizQuestions.map(q => q.answer);
      let correctCount = 0;
      let incorrectCount = 0;

      const detailedResults = correctAnswers.map((answer, index) => {
        const userAnswer = userAnswers[index];
        const isCorrect = userAnswer?.toLowerCase() === answer.toLowerCase();
        
        if (userAnswer !== undefined) {
          if (isCorrect) {
            correctCount++;
          } else {
            incorrectCount++;
          }
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
      this.currentQuizQuestions = null;

      return {
        success: true,
        correctCount,
        incorrectCount,
        totalQuestions: 40,
        percentageScore: Math.round(percentageScore),
        skippedQuestions: 40 - totalAnswered,
        detailedResults // Added detailed results including correct answers
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to calculate results',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
