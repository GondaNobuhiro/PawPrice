/**
 * 楽天ジャンル階層に基づくカテゴリ構造を構築するスクリプト
 *
 * 実行後の構造:
 *   level 2 genre → Category (parentCategoryId = null)
 *   level 3 genre → Category (parentCategoryId = level2 category id)
 *   level 4+ genre → Category (parentCategoryId = level3 category id)
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

function genreToCode(name: string): string {
    const normalized = name
        .normalize('NFKC')
        .toLowerCase()
        .replace(/【[^】]*】/g, ' ')
        .replace(/\[[^\]]*]/g, ' ')
        .replace(/（[^）]*）/g, ' ')
        .replace(/\([^)]*\)/g, ' ')
        .replace(/[|｜/／・●◆★☆※■□▲△▼▽◆]/g, ' ')
        .replace(/[,:：;；]/g, ' ')
        .replace(/[-‐‐-―−]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\s+/g, '_')
        .slice(0, 40);
    return `rakuten_genre_${normalized}`;
}

async function main() {
    // level 2 と level 3 のペットジャンルを取得
    const genres = await prisma.genre.findMany({
        where: {
            platform: 'rakuten',
            isPetGenre: true,
            isActive: true,
            level: { in: [2, 3] },
            name: { not: 'その他' },
        },
        orderBy: [{ level: 'asc' }, { externalGenreId: 'asc' }],
        select: { name: true, level: true, externalGenreId: true, parentExternalGenreId: true },
    });

    const level2Genres = genres.filter(g => g.level === 2);
    const level3Genres = genres.filter(g => g.level === 3);

    console.log(`level2: ${level2Genres.length}件, level3: ${level3Genres.length}件`);

    // level 2 カテゴリを upsert（既存の id=47 系も含めて名前で照合）
    const level2CatByGenreId = new Map<string, bigint>();

    for (const g of level2Genres) {
        const code = genreToCode(g.name);

        // 同名のカテゴリを探す（コードが古い形式でも名前で照合）
        let cat = await prisma.category.findFirst({
            where: { name: g.name, parentCategoryId: null },
            select: { id: true },
        });

        if (!cat) {
            // 名前で見つからない場合はコードで upsert
            cat = await prisma.category.upsert({
                where: { code },
                update: { name: g.name, parentCategoryId: null },
                create: { code, name: g.name },
                select: { id: true },
            });
        }

        // level2 カテゴリは必ず top-level（parentCategoryId = null）にする
        await prisma.category.update({
            where: { id: cat.id },
            data: { parentCategoryId: null },
        });

        level2CatByGenreId.set(g.externalGenreId, cat.id);
        console.log(`  [level2] ${g.name} → category id=${cat.id}`);
    }

    // level 3 カテゴリの parentCategoryId を level 2 に付け替え
    let updated = 0;
    const skipped = new Set<string>();

    for (const g of level3Genres) {
        const parentCatId = level2CatByGenreId.get(g.parentExternalGenreId ?? '');
        if (!parentCatId) {
            skipped.add(g.name);
            continue;
        }

        const code = genreToCode(g.name);
        const cat = await prisma.category.findUnique({
            where: { code },
            select: { id: true, parentCategoryId: true },
        });

        if (!cat) {
            skipped.add(g.name);
            continue;
        }

        // 既に正しいparentが設定されているならスキップ
        if (cat.parentCategoryId === parentCatId) continue;

        await prisma.category.update({
            where: { id: cat.id },
            data: { parentCategoryId: parentCatId },
        });
        updated++;
    }

    console.log(`\nlevel3カテゴリ更新: ${updated}件`);
    if (skipped.size > 0) {
        console.log(`スキップ（カテゴリなし or 親なし）: ${[...skipped].join(', ')}`);
    }

    console.log('\n完了');
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => pool.end());
