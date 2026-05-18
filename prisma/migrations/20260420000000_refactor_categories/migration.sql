-- 新しい大分類を追加
INSERT INTO categories (code, name) VALUES
  ('wear',    '衣類・ウェア'),
  ('bed',     'ベッド・寝具'),
  ('outdoor', 'お出かけ・散歩'),
  ('medical', '医療・健康');

-- rakuten_genre_* を care 配下へ
UPDATE categories
SET parent_category_id = (SELECT id FROM categories WHERE code = 'care')
WHERE code IN (
  'rakuten_genre_耳ケア用品',
  'rakuten_genre_抜け毛取り',
  'rakuten_genre_肉球ケア用品',
  'rakuten_genre_スキンケア用品',
  'rakuten_genre_防虫_ノミ_ダニ対策用品'
);

-- rakuten_genre_* を dish 配下へ
UPDATE categories
SET parent_category_id = (SELECT id FROM categories WHERE code = 'dish')
WHERE code IN (
  'rakuten_genre_給水器',
  'rakuten_genre_フードクリップ_フタ',
  'rakuten_genre_フードスプーン_スコップ',
  'rakuten_genre_給餌器_フードディスペンサー',
  'rakuten_genre_フード計量器'
);

-- rakuten_genre_* と genre_215390 を outdoor 配下へ
UPDATE categories
SET parent_category_id = (SELECT id FROM categories WHERE code = 'outdoor')
WHERE code IN (
  'rakuten_genre_首輪_胴輪_リード',
  'rakuten_genre_お出かけ_お散歩グッズ',
  'rakuten_genre_しつけ用品',
  'genre_215390'
);

-- category_parent_rules テーブルを削除
DROP TABLE IF EXISTS category_parent_rules;