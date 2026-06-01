import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFriendshipsTable20260527020000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "friendship_status_enum" AS ENUM ('pending', 'accepted', 'blocked')`,
    );

    await queryRunner.query(`
      CREATE TABLE "friendships" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "requester_id" uuid NOT NULL,
        "addressee_id" uuid NOT NULL,
        "status" "friendship_status_enum" NOT NULL DEFAULT 'pending',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_friendships" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_friendship_pair" UNIQUE ("requester_id", "addressee_id"),
        CONSTRAINT "FK_friendship_requester" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_friendship_addressee" FOREIGN KEY ("addressee_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "friendships"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "friendship_status_enum"`);
  }
}
