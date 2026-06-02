import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * La tabla transactions fue creada con la columna "incomeSourceId" (camelCase),
 * pero el entity la mapea a income_source_id (snake_case).
 * Esta migración agrega la columna snake_case y migra los datos existentes.
 */
export class FixTransactionIncomeSourceId20260602200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE transactions
        ADD COLUMN IF NOT EXISTS income_source_id UUID
    `);

    await queryRunner.query(`
      UPDATE transactions
      SET income_source_id = "incomeSourceId"
      WHERE "incomeSourceId" IS NOT NULL AND income_source_id IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE transactions DROP COLUMN IF EXISTS income_source_id
    `);
  }
}
