import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Decimal } from 'decimal.js';
import { Repository } from 'typeorm';

import { CreateIncomeSourceDTO, IncomeSource, UpdateIncomeSourceDTO } from '../../domain/incomes';
import { IncomesRepository } from '../../domain/repositories/incomes.repository';
import { IncomesEntity } from '../database/entities/incomes.entity';
@Injectable()
export class IncomesRepositoryImpl implements IncomesRepository {
  constructor(
    @InjectRepository(IncomesEntity)
    private readonly incomeRepository: Repository<IncomesEntity>,
  ) {}

  async bulkCreate(createIncomeDto: CreateIncomeSourceDTO[]): Promise<IncomeSource[]> {
    const income = this.incomeRepository.create(createIncomeDto);
    return await this.incomeRepository.save(income);
  }
  async create(createIncomeDto: CreateIncomeSourceDTO): Promise<IncomeSource> {
    const income = this.incomeRepository.create(createIncomeDto);
    return await this.incomeRepository.save(income);
  }

  async findAll(): Promise<IncomeSource[]> {
    return await this.incomeRepository.find();
  }

  async findById(id: string): Promise<IncomeSource | null> {
    return await this.incomeRepository.findOneBy({ id });
  }

  async findCurrentMonthIncomes(
    userId: string,
    month: number,
    year: number,
  ): Promise<{
    expectedIncomes: { source: string; amount: number; date: Date }[];
    totalExpectedIncomes: number;
    lastUpdate: Date;
  }> {
    const incomes = await this.incomeRepository.find({
      select: ['amount', 'source', 'paymentDays', 'updatedAt'],
      where: {
        userId,
        isActive: true,
      },
    });

    const results = [];
    let totalDecimal = new Decimal(0);
    // Usamos for...of para procesar y sumar en un solo paso
    for (let i = 0; i < incomes.length; i++) {
      const income = incomes[i];

      // 1. Normalizar paymentDays (asegurar que sea array de números)
      const paymentDays = Array.isArray(income.paymentDays)
        ? income.paymentDays
        : [+income.paymentDays];

      // 2. Obtener el día (usando el índice i para corresponder al ingreso actual)
      const day = paymentDays[i] || paymentDays[0] || 1;

      // 3. Crear el objeto Decimal para cálculos precisos
      const amountDecimal = new Decimal(income.amount.toString());
      totalDecimal = totalDecimal.plus(amountDecimal);

      results.push({
        source: income.source,
        amount: amountDecimal.toNumber(), // Convertimos a number para cumplir la interfaz
        date: new Date(year, month - 1, day),
      });
    }

    return {
      expectedIncomes: results,
      totalExpectedIncomes: totalDecimal.toNumber(),
      lastUpdate: new Date(Math.max(...incomes.map((item) => new Date(item.updatedAt).getTime()))),
    };
  }

  async update(id: string, updateIncomeDto: UpdateIncomeSourceDTO): Promise<IncomeSource | null> {
    await this.incomeRepository.update(id, updateIncomeDto);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    await this.incomeRepository.delete(id);
    return true;
  }
}
