import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLastInterestDateToSavingGoals20260515093000 implements MigrationInterface {
  public async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE saving_goals
        ADD COLUMN IF NOT EXISTS last_interest_date DATE;
    `);
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE saving_goals
        DROP COLUMN IF EXISTS last_interest_date;
    `);
  }
}
