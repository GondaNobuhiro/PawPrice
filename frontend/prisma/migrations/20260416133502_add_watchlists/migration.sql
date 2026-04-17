-- CreateTable
CREATE TABLE "watch_conditions" (
    "id" BIGSERIAL NOT NULL,
    "watchlist_id" BIGINT NOT NULL,
    "target_price" INTEGER,
    "notify_on_price_drop" BOOLEAN NOT NULL DEFAULT true,
    "notify_on_lowest" BOOLEAN NOT NULL DEFAULT false,
    "last_notified_price" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "watch_conditions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "watch_conditions_watchlist_id_key" ON "watch_conditions"("watchlist_id");

-- AddForeignKey
ALTER TABLE "watch_conditions" ADD CONSTRAINT "watch_conditions_watchlist_id_fkey" FOREIGN KEY ("watchlist_id") REFERENCES "watchlists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
