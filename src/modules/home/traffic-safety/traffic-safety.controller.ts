import { Controller, Get, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { TrafficSafetyService } from './traffic-safety.service';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';

@Controller('traffic-safety')
export class TrafficSafetyController {
  constructor(private readonly trafficSafetyService: TrafficSafetyService) {}

  @ApiOperation({ summary: 'Get traffic safety questions with answers' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('questions')
  async getQuestions() {
    try {
      const questions = await this.trafficSafetyService.getQuestionsWithAnswers();
      return {
        success: true,
        questions: questions,
      };
    } catch (error) {
      throw new HttpException('Failed to fetch traffic safety questions', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
