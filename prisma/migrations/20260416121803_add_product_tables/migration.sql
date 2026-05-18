-- CreateTable
CREATE TABLE "product_offers" (
    "id" BIGSERIAL NOT NULL,
    "product_id" BIGINT NOT NULL,
    "shop_type" TEXT NOT NULL,
    "external_item_id" TEXT NOT NULL,
    "external_url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "seller_name" TEXT,
    "price" INTEGER NOT NULL,
    "shipping_fee" INTEGER NOT NULL DEFAULT 0,
    "point_amount" INTEGER NOT NULL DEFAULT 0,
    "effective_price" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'JPY',
    "availability_status" TEXT,
    "image_url" TEXT,
    "last_fetched_at" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_histories" (
    "id" BIGSERIAL NOT NULL,
    "product_offer_id" BIGINT NOT NULL,
    "price" INTEGER NOT NULL,
    "shipping_fee" INTEGER NOT NULL DEFAULT 0,
    "point_amount" INTEGER NOT NULL DEFAULT 0,
    "effective_price" INTEGER NOT NULL,
    "fetched_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_histories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_offers_shop_type_external_item_id_key" ON "product_offers"("shop_type", "external_item_id");

-- AddForeignKey
ALTER TABLE "product_offers" ADD CONSTRAINT "product_offers_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_histories" ADD CONSTRAINT "price_histories_product_offer_id_fkey" FOREIGN KEY ("product_offer_id") REFERENCES "product_offers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
