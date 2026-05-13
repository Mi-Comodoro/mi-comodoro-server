import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID, ValidateIf } from 'class-validator';

export type SurplusAction = 'transfer_to_goal' | 'carry_forward' | 'ignore';

export class CloseBudgetDto {
  @ApiPropertyOptional({
    enum: ['transfer_to_goal', 'carry_forward', 'ignore'],
    description: 'Acción a realizar con el excedente al cerrar el presupuesto',
  })
  @IsEnum(['transfer_to_goal', 'carry_forward', 'ignore'])
  @IsOptional()
  surplusAction?: SurplusAction;

  @ApiPropertyOptional({
    example: 'uuid-de-la-meta',
    description: 'ID de la meta destino (requerido si surplusAction es transfer_to_goal)',
  })
  @IsUUID()
  @IsOptional()
  @ValidateIf((o) => o.surplusAction === 'transfer_to_goal')
  targetGoalId?: string;
}
