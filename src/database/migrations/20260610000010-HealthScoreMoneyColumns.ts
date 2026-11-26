import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Los totales de salud financiera eran BIGINT: con un solo importe con centavos, guardar el puntaje fallaba
 * y la persona se quedaba sin el indicador. El ingreso promedio pasa a la misma precisión.
 */
export class HealthScoreMoneyColumns20260610000010 implements MigrationInterface {
  name = 'HealthScoreMoneyColumns20260610000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE financial_health_scores
        ALTER COLUMN total_income       TYPE NUMERIC(14,2),
        ALTER COLUMN total_expenses     TYPE NUMERIC(14,2),
        ALTER COLUMN total_savings      TYPE NUMERIC(14,2),
        ALTER COLUMN avg_monthly_income TYPE NUMERIC(14,2)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // La tabla es un historial de puntajes calculados: redondear al volver atrás no pierde datos de origen
    await queryRunner.query(`
      ALTER TABLE financial_health_scores
        ALTER COLUMN total_income       TYPE BIGINT USING round(total_income),
        ALTER COLUMN total_expenses     TYPE BIGINT USING round(total_expenses),
        ALTER COLUMN total_savings      TYPE BIGINT USING round(total_savings),
        ALTER COLUMN avg_monthly_income TYPE NUMERIC(10,2)
    `);
  }
}
