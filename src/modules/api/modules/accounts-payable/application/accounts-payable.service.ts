import { forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { LoggerProviderService } from '@/core/providers';
import { NotificationsService } from '@/modules/api/modules/notifications/application/services/notifications.service';
import { NotificationType } from '@/modules/api/modules/notifications/domain/enums/notification-type.enum';

import { AccountsReceivableService } from '../../accounts-receivable/application/accounts-receivable.service';
import { AccountPayable } from '../domain/account-payable';
import { AccountPayableRepository } from '../domain/repositories/account-payable.repository';
import { CreateAccountPayableDto } from '../infrastructure/dto/create-account-payable.dto';
import { CreatePaymentDto } from '../infrastructure/dto/create-payment.dto';
import { UpdateAccountPayableDto } from '../infrastructure/dto/update-account-payable.dto';

export interface AccountPayableSummary {
  totalDebt: number;
  monthlyCommitments: number;
  overdueCount: number;
  nextDueDate: Date | null;
  debtToIncomeRatio: number;
  byType: Record<string, number>;
}

@Injectable()
export class AccountsPayableService {
  private readonly context = AccountsPayableService.name;

  constructor(
    @Inject('AccountPayableRepository')
    private readonly repository: AccountPayableRepository,
    private readonly logger: LoggerProviderService,
    @Inject(forwardRef(() => AccountsReceivableService))
    private readonly arService: AccountsReceivableService,
    private readonly notificationsService: NotificationsService,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(userId: string): Promise<AccountPayable[]> {
    this.logger.info(this.context, `Listing accounts payable for user: ${userId}`);
    return this.repository.findAll(userId);
  }

  async findOne(id: string, userId: string): Promise<AccountPayable> {
    this.logger.info(this.context, `Finding account payable: ${id}`);
    const account = await this.repository.findOne(id, userId);
    if (!account) {
      throw new NotFoundException('Account payable not found');
    }
    return account;
  }

  async create(userId: string, dto: CreateAccountPayableDto): Promise<AccountPayable> {
    this.logger.info(this.context, `Creating account payable for user: ${userId}`);
    return this.repository.create({
      userId,
      name: dto.name,
      description: dto.description,
      type: (dto.type as AccountPayable['type']) ?? 'other',
      originalAmount: dto.originalAmount,
      currentBalance: dto.originalAmount,
      minimumPayment: dto.minimumPayment,
      interestRate: dto.interestRate,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      nextPaymentDate: dto.nextPaymentDate ? new Date(dto.nextPaymentDate) : undefined,
      status: 'active',
      nulledAt: null,
    });
  }

  async update(id: string, userId: string, dto: UpdateAccountPayableDto): Promise<AccountPayable> {
    this.logger.info(this.context, `Updating account payable: ${id}`);
    const existing = await this.repository.findOne(id, userId);
    if (!existing) {
      throw new NotFoundException('Account payable not found');
    }

    const updated = await this.repository.update(id, {
      name: dto.name,
      description: dto.description,
      type: dto.type as AccountPayable['type'],
      minimumPayment: dto.minimumPayment,
      interestRate: dto.interestRate,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      nextPaymentDate: dto.nextPaymentDate ? new Date(dto.nextPaymentDate) : undefined,
    });

    if (!updated) {
      throw new NotFoundException('Account payable not found after update');
    }

    return updated;
  }

  async softDelete(id: string, userId: string): Promise<void> {
    this.logger.info(this.context, `Soft deleting account payable: ${id}`);
    const existing = await this.repository.findOne(id, userId);
    if (!existing) {
      throw new NotFoundException('Account payable not found');
    }
    await this.repository.softDelete(id);
  }

  async registerPayment(
    id: string,
    userId: string,
    dto: CreatePaymentDto,
  ): Promise<{ message: string }> {
    this.logger.info(this.context, `Registering payment for account payable: ${id}`);
    const existing = await this.repository.findOne(id, userId);
    if (!existing) {
      throw new NotFoundException('Account payable not found');
    }
    await this.repository.registerPayment(id, dto.amount, new Date(dto.paymentDate), dto.notes);

    if (existing.linkedCxcId) {
      try {
        const cxc = await this.arService.findByIdInternal(existing.linkedCxcId);
        if (cxc) {
          await this.arService.autoCollect(
            existing.linkedCxcId,
            dto.amount,
            new Date(dto.paymentDate),
            dto.notes,
          );
          await this.notificationsService.createNotification(
            cxc.userId,
            NotificationType.PAYMENT_RECEIVED,
            {
              senderId: userId,
              title: 'Pago recibido',
              body: `Se registró un pago de ${dto.amount} para "${cxc.name}"`,
            },
          );
          await this.dataSource.query(
            `UPDATE group_expenses SET status = 'paid' WHERE cxp_id = $1`,
            [id],
          );
        }
      } catch (err) {
        this.logger.warn(
          this.context,
          `No se pudo procesar el cobro vinculado: ${(err as Error).message}`,
        );
      }
    }

    return { message: 'Payment registered successfully' };
  }

  async setLinkedCxc(id: string, linkedCxcId: string): Promise<void> {
    this.logger.info(this.context, `Setting linked CxC ${linkedCxcId} on CxP ${id}`);
    await this.repository.setLinkedCxc(id, linkedCxcId);
  }

  async getSummary(userId: string): Promise<AccountPayableSummary> {
    this.logger.info(this.context, `Getting summary for user: ${userId}`);

    const { accounts, avgMonthlyIncome } = await this.repository.getSummaryData(userId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalDebt = accounts.reduce((sum, a) => sum + Number(a.currentBalance), 0);

    const monthlyCommitments = accounts.reduce(
      (sum, a) => sum + (a.minimumPayment ? Number(a.minimumPayment) : 0),
      0,
    );

    const overdueCount = accounts.filter(
      (a) => a.nextPaymentDate && new Date(a.nextPaymentDate) < today && a.status === 'active',
    ).length;

    const futurePaymentDates = accounts
      .filter(
        (a) => a.status === 'active' && a.nextPaymentDate && new Date(a.nextPaymentDate) >= today,
      )
      .map((a) => new Date(a.nextPaymentDate!));

    const nextDueDate =
      futurePaymentDates.length > 0
        ? futurePaymentDates.reduce((min, d) => (d < min ? d : min))
        : null;

    const annualIncome = avgMonthlyIncome * 12;
    // Sin presupuestos cerrados, avgMonthlyIncome = 0. Si hay deuda, el ratio
    // debe ser alto (riesgo máximo), no 0 (riesgo mínimo).
    const debtToIncomeRatio = annualIncome > 0 ? totalDebt / annualIncome : totalDebt > 0 ? 2 : 0;

    const byType: Record<string, number> = {};
    for (const account of accounts) {
      const t = account.type;
      byType[t] = (byType[t] ?? 0) + Number(account.currentBalance);
    }

    return {
      totalDebt,
      monthlyCommitments,
      overdueCount,
      nextDueDate,
      debtToIncomeRatio,
      byType,
    };
  }
}
