import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomBucketsToBudget20260610000003 implements MigrationInterface {
  name = 'AddCustomBucketsToBudget20260610000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "budgets" ADD COLUMN IF NOT EXISTS "customBuckets" jsonb NOT NULL DEFAULT '[]'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "budgets" DROP COLUMN IF EXISTS "customBuckets"`);
  }
}
