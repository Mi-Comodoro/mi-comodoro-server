import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSavingGoalIdToTransactions20260520000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE transactions
        ADD COLUMN IF NOT EXISTS saving_goal_id UUID NULL,
        ADD COLUMN IF NOT EXISTS from_account_id UUID NULL,
        ADD COLUMN IF NOT EXISTS to_account_id UUID NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE transactions
        DROP COLUMN IF EXISTS saving_goal_id,
        DROP COLUMN IF EXISTS from_account_id,
        DROP COLUMN IF EXISTS to_account_id
    `);
  }
}
