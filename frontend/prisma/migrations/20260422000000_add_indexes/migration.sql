-- products: カテゴリ×アクティブ複合インデックス（カテゴリ絞り込みの高速化）
CREATE INDEX IF NOT EXISTS "products_category_id_is_active_idx" ON "products"("category_id", "is_active");
-- products: アクティブ×作成日（デフォルトソート用）
CREATE INDEX IF NOT EXISTS "products_is_active_created_at_idx" ON "products"("is_active", "created_at" DESC);

-- product_offers: 商品×アクティブ×実質価格（最安値取得の高速化）
CREATE INDEX IF NOT EXISTS "product_offers_product_id_is_active_effective_price_idx" ON "product_offers"("product_id", "is_active", "effective_price");

-- price_histories: オファー×取得日（最新価格履歴取得の高速化）
CREATE INDEX IF NOT EXISTS "price_histories_product_offer_id_fetched_at_idx" ON "price_histories"("product_offer_id", "fetched_at" DESC);

-- notifications: ユーザー×既読（通知一覧取得の高速化）
CREATE INDEX IF NOT EXISTS "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- genres: プラットフォーム×レベル×フラグ（カテゴリ構築クエリの高速化）
CREATE INDEX IF NOT EXISTS "genres_platform_level_is_pet_genre_is_active_idx" ON "genres"("platform", "level", "is_pet_genre", "is_active");