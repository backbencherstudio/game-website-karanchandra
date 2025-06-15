import { PartialType } from '@nestjs/swagger';
import { CreateQuizTestDto } from './create-quiz-test.dto';

export class UpdateQuizTestDto extends PartialType(CreateQuizTestDto) {}
