# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev                        # 開発サーバー起動
npm run build                      # prisma generate + next build
npx tsc --noEmit                   # 型チェック（テストの代替）

# データ収集・更新スクリプト（dotenv/config が必要、.env から自動読み込み）
npm run discover:products          # 楽天から新商品を発見・登録
npm run update:prices              # 楽天オファーの価格更新
npm run discover:yahoo-products    # Yahoo! オファーを既存楽天商品に追加
npm run update:yahoo-prices        # Yahoo! オファーの価格更新
npm run check:notifications        # ウォッチ条件チェックと通知生成
npm run send:notifications         # プッシュ通知送信
npm run classify:categories        # AI によるカテゴリ自動分類

# スクリプトを直接実行する場合
npx tsx prisma/<script>.ts
```

## Architecture

### 全体構成

- **フロントエンド**: Next.js 16（App Router）+ Tailwind CSS v4
- **DB**: PostgreSQL on Neon（サーバーレス）、Prisma ORM + `@prisma/adapter-pg`
- **デプロイ**: Vercel
- **バッチ**: GitHub Actions（スケジュール実行）

### DB 接続

`src/app/lib/prisma.ts` がシングルトンの Prisma クライアントを export する。Neon は PgBouncer 経由のコネクションプールを使用するため、`PrismaPg` アダプター経由で接続している。バッチスクリプト（`prisma/*.ts`）は独自の `PrismaClient` を作成する。

### データモデルの要点

```
Product (isActive, petType: dog|cat|both)
  └─ Category (2階層: parentCategoryId=null がトップ、code で識別)
  └─ Brand / BrandRule (keyword マッチでブランドを自動付与)
  └─ ProductOffer (shopType: rakuten|yahoo, effectivePrice = price - pointAmount)
       └─ PriceHistory (fetchedAt 降順、最新2件で isPriceDown を判定)
  └─ Watchlist → WatchCondition → Notification
```

**`effectivePrice`**: 表示・比較に使う実質価格（price − pointAmount）。  
**`isActive`**: 商品・オファー両方に存在。商品一覧は `offers: { some: { isActive: true } }` 必須。

### ページ構成

| ルート | 役割 |
|---|---|
| `/` (`page.tsx`) | 商品一覧（検索・カテゴリ・並び替え・ページング） |
| `/products/[id]` | 商品詳細（オファー比較・価格推移グラフ・ウォッチ） |
| `/watchlists` | ウォッチリスト管理 |
| `/notifications` | 通知一覧 |

### Server Components と Client Components

- ページ（`page.tsx`）は基本的に Server Component。DB アクセスは `src/app/lib/` 配下の関数で完結。
- `unstable_cache`（5分 TTL）を `getProducts()` に使用。
- ウォッチボタン・フォームなど操作が必要なものは `'use client'` な Client Component。

### セッション管理

Cookie `session_id` をキーに `users` テーブルを参照。セッションがなければ `/api/session/init` にリダイレクトして自動生成。`getSessionUserId()` は React `cache()` で同一リクエスト内の重複 DB アクセスを防ぐ。

### バッチスクリプト（`prisma/` 配下）

| スクリプト | 頻度（GitHub Actions） | 役割 |
|---|---|---|
| `discover-products.ts` | 毎日 UTC 18:00 | 楽天 API から新商品を発見・登録 |
| `update-prices.ts` | UTC 23:00 / 5:00 / 12:00（日3回） | 楽天価格更新・値下がり検知 |
| `discover-yahoo-products.ts` | UTC 2:00（日1回） | Yahoo! オファーを既存楽天商品に追加（新商品は作らない） |
| `update-yahoo-prices.ts` | UTC 2:00 / 8:00 / 15:00（日3回） | Yahoo! 価格更新（楽天アクティブオファー持ち商品のみ） |
| `check-notifications.ts` | 価格更新後 | ウォッチ条件チェック・通知生成 |
| `send-notifications.ts` | チェック後 | Web Push 送信 |
| `classify-categories.ts` | 手動 | Anthropic API でカテゴリ自動分類 |
| `cleanup-yahoo-only-products.ts` | 手動 | 楽天オファーを持たない商品を削除 |

### カテゴリ設計

2階層構造。`parentCategoryId = null` がトップレベル（`code`: food / snack / toilet / care / toy / outdoor / wear / bed / cage / carry / dish / medical / deodorant）。商品一覧のカテゴリ件数は、アクティブオファーを持つ商品のみカウント（`categories.ts` の `fetchCategories`）。

### Yahoo! 統合の制約

- Yahoo! オファーは既存の楽天商品への追加のみ（独自商品は作らない）
- マッチング優先順位: JAN コード → normalizedName + packageSize + petType
- 楽天オファーが非アクティブになった商品の Yahoo! オファーは `update-yahoo-prices.ts` で対象外になる
