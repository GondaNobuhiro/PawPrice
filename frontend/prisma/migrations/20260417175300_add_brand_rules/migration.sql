/*
  Warnings:

  - You are about to drop the column `created_at` on the `brands` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "brands" DROP COLUMN "created_at";

-- CreateTable
CREATE TABLE "brand_rules" (
    "id" BIGSERIAL NOT NULL,
    "brand_id" BIGINT NOT NULL,
    "keyword" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "brand_rules_brand_id_keyword_key" ON "brand_rules"("brand_id", "keyword");

-- AddForeignKey
ALTER TABLE "brand_rules" ADD CONSTRAINT "brand_rules_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
