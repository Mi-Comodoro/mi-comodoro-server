import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

import { FinancialStrategyType } from '../../../budgets/domain/budget';
import { IncomeFrequency } from '../../../incomes/domain/incomes';
import {
  FinancialProfileEnum,
  FinancialStrategyEnum,
  GenderEnum,
  UsageEnum,
} from '../../../shared/enum/enum';
import {
  BudgetInfo,
  FinancesInfo,
  Incomes,
  OnboardingData,
  UserInfo,
} from '../../application/dto/create-user.dto';

class OnboardingUserInfoDto implements UserInfo {
  @ApiProperty({
    description: 'User display name',
    example: 'John Doe',
  })
  @IsNotEmpty({ message: 'Display name is required' })
  @IsString({ message: 'Display name must be a string' })
  displayName: string;

  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
  })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email: string;

  @ApiProperty({
    description: 'User phone number',
    example: '1234567890',
  })
  @IsNotEmpty({ message: 'Phone is required' })
  @IsString({ message: 'Phone must be a string' })
  phone: string;

  @ApiProperty({
    description: 'User gender',
    type: 'string',
    enum: GenderEnum,
    example: GenderEnum.MALE,
  })
  @IsNotEmpty({ message: 'Gender is required' })
  @IsEnum(GenderEnum, {
    message: `Gender must be one of: ${Object.values(GenderEnum).join(', ')}`,
  })
  gender: GenderEnum;
}

export class OnboardingFinancesInfoDto implements FinancesInfo {
  @ApiProperty({
    description: 'User financial profile',
    type: 'string',
    enum: FinancialProfileEnum,
    example: FinancialProfileEnum.employee,
  })
  @IsNotEmpty({ message: 'Financial profile is required' })
  @IsEnum(FinancialProfileEnum, {
    message: `Profile must be one of: ${Object.values(FinancialProfileEnum).join(', ')}`,
  })
  profile: FinancialProfileEnum;

  @ApiProperty({
    description: 'User financial usage',
    enum: UsageEnum,
    example: UsageEnum.PERSONAL,
  })
  @ApiProperty({
    description: 'User financial information',
    example: 'COP',
  })
  @IsNotEmpty({ message: 'Currency is required' })
  @IsString({ message: 'Currency must be a string' })
  currency: string;

  @ApiProperty({
    description: 'User financial information',
    type: 'string',
    example: new Date(),
  })
  monthPayment: string | null;
  @ApiProperty({
    description: 'User financial information',
    type: 'array',
    example: [new Date(), new Date().setDate(new Date().getDate() + 15)],
  })
  biweeklyPayments: [string, string];
}

class OnboardingStrategyInfoDto implements BudgetInfo {
  @IsNotEmpty({ message: 'Usage is required' })
  @IsString({ message: 'Usage must be a string' })
  @ApiProperty({
    description: 'Usage type for budget strategy',
    example: 'personal',
  })
  usage: string;

  @ApiProperty({
    description: 'Budget frequency',
    type: 'string',
    example: 'monthly',
  })
  @IsNotEmpty({ message: 'Budget frequency is required' })
  @IsString({ message: 'Budget frequency must be a string' })
  budgetFrequency: IncomeFrequency;

  @ApiProperty({
    description: 'User financial strategy',
    type: 'string',
    enum: FinancialStrategyEnum,
    example: FinancialStrategyEnum.BALANCED,
  })
  @IsNotEmpty({ message: 'Financial strategy is required' })
  @IsEnum(FinancialStrategyEnum, {
    message: `Strategy must be one of: ${Object.values(FinancialStrategyEnum).join(', ')}`,
  })
  strategy: FinancialStrategyType;

  @ApiProperty({
    description: 'Custom allocations for user financial strategy - needs',
    example: 50,
  })
  @IsNotEmpty({ message: 'Needs allocation is required' })
  @IsNumber({}, { message: 'Needs must be a number' })
  @Min(0, { message: 'Needs must be at least 0' })
  @Max(100, { message: 'Needs cannot exceed 100' })
  needs: number;

  @ApiProperty({
    description: 'Custom allocations for user financial strategy - wants',
    example: 30,
  })
  @IsNotEmpty({ message: 'Wants allocation is required' })
  @IsNumber({}, { message: 'Wants must be a number' })
  @Min(0, { message: 'Wants must be at least 0' })
  @Max(100, { message: 'Wants cannot exceed 100' })
  wants: number;

  @ApiProperty({
    description: 'Custom allocations for user financial strategy - savings',
    example: 20,
  })
  @IsNotEmpty({ message: 'Savings allocation is required' })
  @IsNumber({}, { message: 'Savings must be a number' })
  @Min(0, { message: 'Savings must be at least 0' })
  @Max(100, { message: 'Savings cannot exceed 100' })
  savings: number;
}

export class IncomesDto implements Incomes {
  @ApiProperty({
    description: 'Income source',
    example: 'salary',
  })
  @IsNotEmpty({ message: 'Income source is required' })
  @IsString({ message: 'Income source must be a string' })
  source: string;

  @ApiProperty({
    description: 'Income amount',
    example: 5000,
  })
  @IsNotEmpty({ message: 'Income amount is required' })
  @IsNumber({}, { message: 'Income amount must be a number' })
  amount: number;
  @ApiProperty({
    description: 'Indicates if the income is additional to the main source',
    example: false,
  })
  @IsNotEmpty({ message: 'isAdditional is required' })
  isAdditional: boolean;
}

export class IncomeDataDto {
  @ApiProperty({
    description: 'List of user income sources',
    type: [IncomesDto],
  })
  @IsNotEmpty({ message: 'At least one income source is required' })
  @IsNotEmpty({ each: true, message: 'Each income source must be valid' })
  incomes: IncomesDto[];

  @ApiProperty({
    description: 'Payment dates for the income source',
    example: new Date(),
  })
  @IsOptional()
  paymentDates: string | [string, string] | null;
  @ApiProperty({
    description: 'Frequency of the income source',
    type: 'string',
    example: 'monthly',
  })
  @IsOptional()
  frequency: IncomeFrequency | null;
}

export class OnboardingDto implements OnboardingData {
  @ApiProperty({
    description: 'User personal information',
    type: OnboardingUserInfoDto,
  })
  @IsNotEmpty({ message: 'User information is required' })
  userInfo: OnboardingUserInfoDto;

  @ApiProperty({
    description: 'User financial information',
    type: OnboardingFinancesInfoDto,
  })
  @IsNotEmpty({ message: 'Financial information is required' })
  finances: OnboardingFinancesInfoDto;

  @ApiProperty({
    description: 'User financial strategy',
    type: OnboardingStrategyInfoDto,
  })
  @IsNotEmpty({ message: 'Budget strategy information is required' })
  budget: OnboardingStrategyInfoDto;

  @ApiProperty({
    description: 'User income sources',
    type: IncomeDataDto,
  })
  @ValidateNested()
  @Type(() => IncomeDataDto)
  incomes: IncomeDataDto;
}
