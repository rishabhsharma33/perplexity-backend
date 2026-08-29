import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { MessageRole } from '../schemas/message.schema';
import { SourceDto } from './source.dto';

export class CreateMessageDto {
  @ApiProperty({ enum: MessageRole, example: MessageRole.USER })
  @IsEnum(MessageRole)
  role!: MessageRole;

  @ApiProperty({ example: 'What is the tallest mountain in the world?' })
  @IsString()
  @MinLength(1)
  content!: string;

  @ApiPropertyOptional({ type: [SourceDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SourceDto)
  sources?: SourceDto[];
}
