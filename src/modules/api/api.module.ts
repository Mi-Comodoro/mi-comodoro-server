import { Module } from '@nestjs/common';

import { AccountModule } from './modules/accounts/account.module';
import { AccountsPayableModule } from './modules/accounts-payable/accounts-payable.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuthModule } from './modules/auth/auth.module';
import { BillsModule } from './modules/bills/bills.module';
import { BudgetModule } from './modules/budgets/budget.module';
import { CategoryModule } from './modules/categories/category.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { FinancesModule } from './modules/finances/finances.module';
import { HealthModule } from './modules/health/health.module';
import { IncomesModule } from './modules/incomes/incomes.module';
import { SavingsModule } from './modules/savings/savings.module';
import { TransactionModule } from './modules/transactions/transaction.module';
import { UserProfileModule } from './modules/user-profile/user-profile.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    HealthModule,
    AuthModule,
    AccountModule,
    UserProfileModule,
    UsersModule,
    FinancesModule,
    BudgetModule,
    CategoryModule,
    TransactionModule,
    BillsModule,
    SavingsModule,
    IncomesModule,
    ExpensesModule,
    AnalyticsModule,
    AccountsPayableModule,
  ],
})
export class ApiModule {}
