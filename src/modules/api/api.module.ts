import { Module } from '@nestjs/common';

import { AccountModule } from './modules/accounts/account.module';
import { AccountsPayableModule } from './modules/accounts-payable/accounts-payable.module';
import { AccountsReceivableModule } from './modules/accounts-receivable/accounts-receivable.module';
import { AdminModule } from './modules/admin/admin.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuthModule } from './modules/auth/auth.module';
import { BillsModule } from './modules/bills/bills.module';
import { BudgetModule } from './modules/budgets/budget.module';
import { CategoryModule } from './modules/categories/category.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { FinancesModule } from './modules/finances/finances.module';
import { FriendshipsModule } from './modules/friendships/friendships.module';
import { GroupsModule } from './modules/groups/groups.module';
import { HealthModule } from './modules/health/health.module';
import { IncomesModule } from './modules/incomes/incomes.module';
import { PlansModule } from './modules/plans/plan.module';
import { SavingsModule } from './modules/savings/savings.module';
import { SettingsModule } from './modules/settings/settings.module';
import { TransactionModule } from './modules/transactions/transaction.module';
import { TravelExpenseModule } from './modules/travel-expenses/travel-expense.module';
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
    AccountsReceivableModule,
    GroupsModule,
    AdminModule,
    TravelExpenseModule,
    SettingsModule,
    PlansModule,
    FriendshipsModule,
  ],
})
export class ApiModule {}
