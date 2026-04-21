/**
 * カテゴリ構造を楽天 Level 2 ジャンル階層に完全再構築する。
 *
 * 対象:
 * 1. genre_* コード（旧形式）→ Level 2 親カテゴリに再割り当て
 * 2. rakuten_genre_* コード（新形式）→ Level 2 親カテゴリに再割り当て（残余）
 * 3. 手作りカテゴリ（dog_cat_food など）→ 適切な Level 2 親に移動
 * 4. ペット・ペットグッズ（Level 1）配下の商品 → 商品名キーワードで振り分け
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const prisma = new PrismaClient({
    adapter: new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL })),
});

const dryRun = process.argv.includes('--dry-run');

function normalizeForCode(name: string): string {
    return name
        .normalize('NFKC')
        .toLowerCase()
        .replace(/【[^】]*】/g, ' ')
        .replace(/\[[^\]]*]/g, ' ')
        .replace(/（[^）]*）/g, ' ')
        .replace(/\([^)]*\)/g, ' ')
        .replace(/送料無料|送料込み|正規品|公式|最安値|限定|お買い得/g, ' ')
        .replace(/ポイント\d+倍|ポイントアップ|セール/gi, ' ')
        .replace(/税込|あす楽|翌日配送/g, ' ')
        .replace(/[|｜/／・●◆★☆※■□▲△▼▽◆]/g, ' ')
        .replace(/[,:：;；]/g, ' ')
        .replace(/[-‐-‒–—―]/g, ' ')
        .replace(/[!"#$%&'*=~^`{}<>?＋+]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function genreToCode(name: string): string {
    return `rakuten_genre_${normalizeForCode(name).replace(/\s+/g, '_').slice(0, 40)}`;
}

// 手作りカテゴリ → Level 2 ジャンル名のマッピング
const MANUAL_MAPPING: Record<string, string> = {
    dog_cat_food:       '犬用品',
    snacks:             '犬用品',
    pet_sheets:         '犬用品',
    cat_litter:         '猫用品',
    toilet_main_unit:   '犬用品',
    toilet_supplies:    '犬用品',
    water_feeders:      'ペット用食器・給水器・給餌器',
    feeding_bowls:      'ペット用食器・給水器・給餌器',
    cages:              '犬用品',
    carriers:           '犬用品',
    toys:               '犬用品',
    deodorizers:        'ペット用お手入れ用品',
    scratchers:         '猫用品',
};

// 商品名キーワードで Level 2 ジャンルを判定（ペット・ペットグッズ商品用）
const PRODUCT_RULES: [string, string[]][] = [
    ['猫用品',                    ['キャットフード', 'キャット', '猫', 'ネコ', 'ねこ', '猫砂']],
    ['犬用品',                    ['ドッグフード', 'ドッグ', '犬', 'イヌ', 'いぬ']],
    ['ペット用お手入れ用品',      ['シャンプー', 'グルーミング', '爪切り', 'ブラシ', 'デンタル', 'ノミ', 'ダニ']],
    ['ペット用食器・給水器・給餌器', ['食器', '給水器', '給餌器', 'ウォーターボウル', 'フードボウル']],
    ['室内ペット用家電',          ['空気清浄機', '暖房', '冷房', 'ドライヤー']],
    ['動物用医薬品',              ['医薬品', '駆虫', 'フィラリア', '皮膚薬', '目薬']],
    ['犬用品',                    ['']], // デフォルト（最後にマッチ）
];

function classifyProductName(name: string): string {
    for (const [genre, keywords] of PRODUCT_RULES) {
        for (const kw of keywords) {
            if (kw && name.includes(kw)) return genre;
        }
    }
    return '犬用品'; // fallback
}

async function main() {
    // ジャンル階層を読み込む
    const genres = await prisma.genre.findMany({
        where: { platform: 'rakuten', isPetGenre: true, isActive: true },
        select: { externalGenreId: true, name: true, parentExternalGenreId: true, level: true },
    });
    const genreById = new Map(genres.map((g) => [g.externalGenreId, g]));

    function getLevel2AncestorId(externalGenreId: string): string | null {
        const genre = genreById.get(externalGenreId);
        if (!genre) return null;
        if (genre.level === 2) return externalGenreId;
        if (!genre.parentExternalGenreId) return null;
        return getLevel2AncestorId(genre.parentExternalGenreId);
    }

    // Level 2 ジャンルの名前 → カテゴリ (parentCategoryId=null のもの)
    const level2GenreNames = genres.filter((g) => g.level === 2 && g.name !== 'その他').map((g) => g.name);
    const level2Cats = await prisma.category.findMany({
        where: { parentCategoryId: null, name: { in: level2GenreNames } },
        select: { id: true, name: true, code: true },
    });
    const parentByName = new Map(level2Cats.map((c) => [c.name, c]));

    // 全カテゴリを読み込む
    const allCats = await prisma.category.findMany({
        select: { id: true, code: true, name: true, parentCategoryId: true },
    });

    let fixed = 0;
    let skipped = 0;

    // --- Step 1: genre_* コードのカテゴリを Level 2 親に割り当て ---
    console.log('\n=== Step 1: genre_* カテゴリの再割り当て ===');
    for (const cat of allCats) {
        if (!cat.code.startsWith('genre_')) continue;
        const externalGenreId = cat.code.replace('genre_', '');
        const level2Id = getLevel2AncestorId(externalGenreId);
        if (!level2Id) continue;
        const level2Genre = genreById.get(level2Id)!;
        const parentCat = parentByName.get(level2Genre.name);
        if (!parentCat) continue;
        if (cat.parentCategoryId === parentCat.id) continue;

        console.log(`[FIX] "${cat.name}" [${cat.code}] → "${level2Genre.name}"`);
        fixed++;
        if (!dryRun) {
            await prisma.category.update({ where: { id: cat.id }, data: { parentCategoryId: parentCat.id } });
        }
    }

    // --- Step 2: rakuten_genre_* でまだ旧親に残っているカテゴリを再割り当て ---
    console.log('\n=== Step 2: rakuten_genre_* 残余カテゴリの再割り当て ===');
    const OLD_PARENT_CODES = ['food','snack','toilet','dish','cage','carry','toy','deodorant','care','wear','bed','outdoor','medical','other'];
    const oldParentIds = new Set(
        (await prisma.category.findMany({
            where: { code: { in: OLD_PARENT_CODES } },
            select: { id: true },
        })).map((c) => c.id.toString())
    );

    for (const cat of allCats) {
        if (!cat.code.startsWith('rakuten_genre_')) continue;
        if (!cat.parentCategoryId) continue;
        if (!oldParentIds.has(cat.parentCategoryId.toString())) continue;

        // 名前でLevel2親を探す
        const parentCat = parentByName.get(cat.name);
        if (parentCat) {
            // このカテゴリ自体がLevel2親 → null に昇格
            console.log(`[PROMOTE] "${cat.name}" → top-level`);
            fixed++;
            if (!dryRun) {
                await prisma.category.update({ where: { id: cat.id }, data: { parentCategoryId: null } });
            }
            continue;
        }

        // ジャンル名でLevel2祖先を探す（名前マッチング）
        const matchedGenre = genres.find((g) => (g.level ?? 0) >= 3 && g.name === cat.name);
        if (matchedGenre) {
            const level2Id = getLevel2AncestorId(matchedGenre.externalGenreId);
            if (level2Id) {
                const level2Genre = genreById.get(level2Id)!;
                const parent = parentByName.get(level2Genre.name);
                if (parent && cat.parentCategoryId !== parent.id) {
                    console.log(`[FIX] "${cat.name}" → "${level2Genre.name}"`);
                    fixed++;
                    if (!dryRun) {
                        await prisma.category.update({ where: { id: cat.id }, data: { parentCategoryId: parent.id } });
                    }
                    continue;
                }
            }
        }

        console.log(`[SKIP] "${cat.name}" [${cat.code}] — Level2祖先不明`);
        skipped++;
    }

    // --- Step 3: 手作りカテゴリを Level 2 親に移動 ---
    console.log('\n=== Step 3: 手作りカテゴリの移動 ===');
    for (const [code, targetName] of Object.entries(MANUAL_MAPPING)) {
        const cat = allCats.find((c) => c.code === code);
        if (!cat) continue;
        const parentCat = parentByName.get(targetName);
        if (!parentCat) continue;
        if (cat.parentCategoryId === parentCat.id) continue;

        console.log(`[MOVE] "${cat.name}" [${cat.code}] → "${targetName}"`);
        fixed++;
        if (!dryRun) {
            await prisma.category.update({ where: { id: cat.id }, data: { parentCategoryId: parentCat.id } });
        }
    }

    // --- Step 4: ペット・ペットグッズ（Level 1）配下の商品を振り分け ---
    console.log('\n=== Step 4: ペット・ペットグッズ商品の振り分け ===');
    const level1Cat = allCats.find((c) => c.name === 'ペット・ペットグッズ' && !c.parentCategoryId);
    if (!level1Cat) {
        // otherの下にある場合も探す
        const l1 = allCats.find((c) => c.name === 'ペット・ペットグッズ');
        if (!l1) {
            console.log('[SKIP] ペット・ペットグッズカテゴリが見つかりません');
        }
    }

    const petGoodsCategories = allCats.filter((c) => c.name === 'ペット・ペットグッズ');
    for (const pgCat of petGoodsCategories) {
        const products = await prisma.product.findMany({
            where: { categoryId: pgCat.id },
            select: { id: true, name: true },
        });
        if (products.length === 0) continue;

        console.log(`  "${pgCat.name}" [${pgCat.code}] に ${products.length}件`);

        const categoryByName = new Map(level2Cats.map((c) => [c.name, c]));

        for (const product of products) {
            const targetName = classifyProductName(product.name);
            const targetCat = categoryByName.get(targetName);
            if (!targetCat) continue;

            if (!dryRun) {
                // 商品を適切なLevel2カテゴリ直下に移動
                // （既存の子カテゴリが存在すれば理想的だが、直接Level2に置く）
                await prisma.product.update({
                    where: { id: product.id },
                    data: { categoryId: targetCat.id },
                });
            }
        }

        if (!dryRun) {
            const [dog, cat, other] = await Promise.all([
                prisma.product.count({ where: { categoryId: pgCat.id, name: { contains: '犬' } } }),
                prisma.product.count({ where: { categoryId: pgCat.id, name: { contains: '猫' } } }),
                prisma.product.count({ where: { categoryId: pgCat.id } }),
            ]);
            console.log(`  → 移動後残: ${other}件`);
        }
    }

    console.log(`\n完了: fixed=${fixed}, skipped=${skipped}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());