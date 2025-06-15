import { Controller, Get, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { EnviromentService } from './enviroment.service';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';

@Controller('enviroment')
export class EnviromentController {
  constructor(private readonly enviromentService: EnviromentService) {}

  @ApiOperation({ summary: 'Get environment questions with answers' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('questions')
  async getQuestions() {
    try {
      const questions = await this.enviromentService.getQuestionsWithAnswers();
      return {
        success: true,
        questions: questions,
      };
    } catch (error) {
      throw new HttpException('Failed to fetch environment questions', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
