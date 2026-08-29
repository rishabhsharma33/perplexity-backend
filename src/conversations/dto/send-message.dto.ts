import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ example: 'What is the tallest mountain in the world?' })
  @IsString()
  @MinLength(1)
  content!: string;
}
