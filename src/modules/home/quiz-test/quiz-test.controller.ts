import { Controller, Get, Post, Body, Patch, Param, Delete, Req, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { QuizTestService } from './quiz-test.service';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';

@Controller('quiz-test')
export class QuizTestController {
  constructor(private readonly quizTestService: QuizTestService) {}

  // get all question
  @ApiOperation({ summary: 'Get questions' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('questions')
  async getQuestions(@Req() req: Request) {
    try {
      const filteredQuestion = await this.quizTestService.getQuestionByFIlter()

      return {
        success: true,
        questions: filteredQuestion,
      };
    } catch (error) {
      throw new HttpException('Failed to fetch questions', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // check message with answer
  @ApiOperation({ summary: 'Submit answers to questions' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('submit-answers')
  async submitAnswers(@Req() req: Request, @Body() data: { answers: string[] }) {
    try {
      const result = await this.quizTestService.calculateResults(data.answers);
      return result;
    } catch (error) {
      throw new HttpException('Failed to submit answers', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

}
