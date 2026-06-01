import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

import { BillFrequency } from '../../domain/bills';

export class CreateBillDto {
  @ApiProperty({ example: 'Netflix' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'uuid' })
  @IsUUID()
  categoryId: string;

  @ApiProperty({ example: 45000 })
  @IsNumber()
  @Min(0)
  expectedAmount: number;

  @ApiProperty({ example: 15, description: 'Día del mes (1-31)' })
  @IsInt()
  @Min(1)
  @Max(31)
  billingDay: number;

  @ApiProperty({ enum: ['monthly', 'yearly'], example: 'monthly' })
  @IsEnum(['monthly', 'yearly'])
  frequency: BillFrequency;
}

export class UpdateBillDto extends PartialType(CreateBillDto) {}

export class ImportBillsDto {
  @ApiProperty({ type: [String], example: ['uuid1', 'uuid2'] })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  billIds: string[];
}
