import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTimezoneToUsers20260610000005 implements MigrationInterface {
  name = 'AddTimezoneToUsers20260610000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "timezone" character varying NOT NULL DEFAULT 'America/Bogota'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "timezone"`);
  }
}
