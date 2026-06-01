import type { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeCategoryIdNullableInTransactions20260521000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE transactions
        ALTER COLUMN category_id DROP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE transactions SET category_id = '00000000-0000-0000-0000-000000000000' WHERE category_id IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE transactions
        ALTER COLUMN category_id SET NOT NULL
    `);
  }
}
