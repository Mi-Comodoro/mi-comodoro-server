import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsNotEmpty, IsNumber, IsString, IsUUID, Min } from 'class-validator';

export class CreateGroupExpenseDto {
  @ApiProperty({ example: 'Vuelo Bogotá-Cartagena' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 450000, minimum: 1 })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  amount: number;

  @ApiProperty({ example: '2026-07-15' })
  @IsDateString()
  dueDate: string;

  @ApiProperty({ example: 'uuid-del-responsable' })
  @IsUUID()
  responsibleUserId: string;
}
