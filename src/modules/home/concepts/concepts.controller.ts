import { Controller, Get, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { ConceptsService } from './concepts.service';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';

@Controller('concepts')
export class ConceptsController {
  constructor(private readonly conceptsService: ConceptsService) {}

  @ApiOperation({ summary: 'Get concepts questions with answers' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('questions')
  async getQuestions() {
    try {
      console.log("concepts working")
      const questions = await this.conceptsService.getQuestionsWithAnswers();
      return {
        success: true,
        questions: questions,
      };
    } catch (error) {
      throw new HttpException('Failed to fetch concepts questions', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
