import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInterestTransactionType20260515092000 implements MigrationInterface {
  public async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      DO $$ BEGIN
        ALTER TYPE transactions_type_enum ADD VALUE IF NOT EXISTS 'interest';
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async down(_qr: QueryRunner): Promise<void> {
    // Postgres does not support removing enum values
  }
}
