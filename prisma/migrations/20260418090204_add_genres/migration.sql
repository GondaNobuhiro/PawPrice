-- CreateTable
CREATE TABLE "genres" (
    "id" BIGSERIAL NOT NULL,
    "platform" TEXT NOT NULL,
    "external_genre_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parent_external_genre_id" TEXT,
    "level" INTEGER,
    "is_pet_genre" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "genres_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "genres_platform_external_genre_id_key" ON "genres"("platform", "external_genre_id");
