import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomBucketIdToPlannedExpense20260610000004 implements MigrationInterface {
  name = 'AddCustomBucketIdToPlannedExpense20260610000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "expenses_planned" ADD COLUMN IF NOT EXISTS "custom_bucket_id" uuid NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "expenses_planned" DROP COLUMN IF EXISTS "custom_bucket_id"`,
    );
  }
}
