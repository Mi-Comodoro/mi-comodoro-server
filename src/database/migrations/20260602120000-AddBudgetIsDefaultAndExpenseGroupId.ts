import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBudgetIsDefaultAndExpenseGroupId20260602120000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE budgets
        ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      ALTER TABLE expenses_planned
        ADD COLUMN IF NOT EXISTS group_id UUID
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE expenses_planned DROP COLUMN IF EXISTS group_id
    `);

    await queryRunner.query(`
      ALTER TABLE budgets DROP COLUMN IF EXISTS is_default
    `);
  }
}
