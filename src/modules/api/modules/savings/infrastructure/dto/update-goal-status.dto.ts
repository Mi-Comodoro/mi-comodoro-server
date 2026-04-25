import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

import { GoalStatus } from '../../domain/savings-goals';

export class UpdateGoalStatusDto {
  @ApiProperty({
    enum: GoalStatus,
    description: 'New status for the goal',
    example: GoalStatus.IN_PROGRESS,
  })
  @IsNotEmpty()
  @IsEnum(GoalStatus)
  status: GoalStatus;
}
