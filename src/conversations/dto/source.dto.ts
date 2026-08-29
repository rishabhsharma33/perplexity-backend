import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl } from 'class-validator';

export class SourceDto {
  @ApiProperty({ example: 'Wikipedia' })
  @IsString()
  title!: string;

  @ApiProperty({ example: 'https://en.wikipedia.org/wiki/Example' })
  @IsUrl()
  url!: string;

  @ApiPropertyOptional({ example: 'A short excerpt from the page.' })
  @IsOptional()
  @IsString()
  snippet?: string;
}
