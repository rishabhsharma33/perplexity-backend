import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateConversationDto {
  @ApiPropertyOptional({ example: 'Trip planning to Japan' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;
}
