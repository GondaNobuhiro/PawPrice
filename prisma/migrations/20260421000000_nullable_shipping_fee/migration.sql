-- shippingFee を nullable に変更
-- null = 送料別（金額不明）, 0 = 送料無料
ALTER TABLE product_offers ALTER COLUMN shipping_fee DROP NOT NULL;
ALTER TABLE product_offers ALTER COLUMN shipping_fee DROP DEFAULT;

ALTER TABLE price_histories ALTER COLUMN shipping_fee DROP NOT NULL;
ALTER TABLE price_histories ALTER COLUMN shipping_fee DROP DEFAULT;
