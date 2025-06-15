import { Controller, Get, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { TrafficRulesService } from './traffic-rules.service';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { SubscriptionGuard } from 'src/modules/auth/guards/subscription.guard';

@Controller('traffic-rules')
export class TrafficRulesController {
  constructor(private readonly trafficRulesService: TrafficRulesService) {}

  @ApiOperation({ summary: 'Get traffic rules questions with answers' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SubscriptionGuard)  // Add SubscriptionGuard here
  @Get('questions')
  async getQuestions() {
    try {
      const questions = await this.trafficRulesService.getQuestionsWithAnswers();
      return {
        success: true,
        questions: questions,
      };
    } catch (error) {
      throw new HttpException('Failed to fetch traffic rules questions', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
