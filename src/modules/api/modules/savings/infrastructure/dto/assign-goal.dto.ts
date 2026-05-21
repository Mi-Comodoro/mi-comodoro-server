import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignGoalDto {
  @ApiProperty({ description: 'UUID de la meta de ahorro a asignar' })
  @IsUUID()
  savingGoalId: string;
}
