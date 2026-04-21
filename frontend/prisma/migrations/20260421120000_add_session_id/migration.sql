ALTER TABLE "users" ADD COLUMN "session_id" TEXT;
ALTER TABLE "users" ADD CONSTRAINT "users_session_id_key" UNIQUE ("session_id");
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;