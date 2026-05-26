import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueConstraintsContable1779819294309 implements MigrationInterface {
  name = 'AddUniqueConstraintsContable1779819294309';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Nueva columna para trazabilidad de ahorro completado
    await queryRunner.query(`ALTER TABLE "transactions" ADD "planned_saving_id" character varying`);

    // Unique constraint: una sola transacción por planned_saving
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD CONSTRAINT "UQ_transactions_planned_saving_id" UNIQUE ("planned_saving_id")`,
    );

    // Unique constraint: una sola transacción por planned_expense
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD CONSTRAINT "UQ_transactions_planned_expense_id" UNIQUE ("planned_expense_id")`,
    );

    // Unique constraint: una sola transacción por planned_income
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD CONSTRAINT "UQ_transactions_planned_income_id" UNIQUE ("planned_income_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP CONSTRAINT "UQ_transactions_planned_income_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP CONSTRAINT "UQ_transactions_planned_expense_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP CONSTRAINT "UQ_transactions_planned_saving_id"`,
    );
    await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN "planned_saving_id"`);
  }
}
