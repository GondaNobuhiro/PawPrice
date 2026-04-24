/**
 * 同じ normalizedName + petType を持つ重複商品を統合する。
 * - オファーを件数最多（同数なら最小ID）の商品に集約
 * - watchlists / watch_conditions / notifications も付け替え
 * - 重複商品を isActive=false に
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const prisma = new PrismaClient({
    adapter: new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL })),
});

const dryRun = process.argv.includes('--dry-run');

async function main() {
    // 重複グループを取得（normalizedName + petType が同じ、どちらも isActive=true）
    // package_size も GROUP BY に含め、容量・個数違いを別商品として扱う
    const groups = await prisma.$queryRaw<{ normalized_name: string; pet_type: string; ids: string }[]>`
        SELECT normalized_name, pet_type, STRING_AGG(id::text, ',' ORDER BY id ASC) AS ids
        FROM products
        WHERE is_active = true AND normalized_name IS NOT NULL AND normalized_name != ''
        GROUP BY normalized_name, pet_type, COALESCE(package_size, '')
        HAVING COUNT(*) > 1
    `;

    console.log(`重複グループ数: ${groups.length}`);

    let merged = 0;
    let offersReassigned = 0;

    for (const group of groups) {
        const ids = group.ids.split(',').map(BigInt);

        // オファー数の多い順、同数なら最小IDを canonical に
        const productsWithCount = await prisma.product.findMany({
            where: { id: { in: ids } },
            select: {
                id: true,
                name: true,
                imageUrl: true,
                _count: { select: { offers: { where: { isActive: true } } } },
            },
        });

        productsWithCount.sort((a, b) => {
            const diff = b._count.offers - a._count.offers;
            if (diff !== 0) return diff;
            return a.id < b.id ? -1 : 1;
        });

        const canonical = productsWithCount[0];
        const duplicates = productsWithCount.slice(1);
        const dupIds = duplicates.map((d) => d.id);

        console.log(`\n[MERGE] "${group.normalized_name.slice(0, 60)}" (${group.pet_type})`);
        console.log(`  canonical: id=${canonical.id} offers=${canonical._count.offers}`);
        for (const d of duplicates) {
            console.log(`  dup:       id=${d.id} offers=${d._count.offers}`);
        }

        if (!dryRun) {
            // 1. 画像がなければ重複から引き継ぐ
            if (!canonical.imageUrl) {
                const withImage = duplicates.find((d) => d.imageUrl);
                if (withImage) {
                    await prisma.product.update({
                        where: { id: canonical.id },
                        data: { imageUrl: withImage.imageUrl },
                    });
                }
            }

            // 2. オファーを canonical に付け替え
            const reassigned = await prisma.productOffer.updateMany({
                where: { productId: { in: dupIds } },
                data: { productId: canonical.id },
            });
            offersReassigned += reassigned.count;

            // 3. watchlists を付け替え（重複を避けるため既存チェック）
            for (const dupId of dupIds) {
                const watchlists = await prisma.watchlist.findMany({ where: { productId: dupId } });
                for (const w of watchlists) {
                    const exists = await prisma.watchlist.findFirst({
                        where: { userId: w.userId, productId: canonical.id },
                    });
                    if (!exists) {
                        await prisma.watchlist.update({ where: { id: w.id }, data: { productId: canonical.id } });
                    } else {
                        await prisma.watchlist.delete({ where: { id: w.id } });
                    }
                }

                // 4. notifications を付け替え
                await prisma.notification.updateMany({
                    where: { productId: dupId },
                    data: { productId: canonical.id },
                });
            }

            // 6. 重複商品を非アクティブ化
            await prisma.product.updateMany({
                where: { id: { in: dupIds } },
                data: { isActive: false },
            });
        }

        merged += duplicates.length;
    }

    console.log(`\n完了: ${merged}件を統合, オファー再割り当て=${offersReassigned}件`);
    if (dryRun) console.log('(--dry-run モード: DBに変更なし)');
}

main().catch(console.error).finally(() => prisma.$disconnect());