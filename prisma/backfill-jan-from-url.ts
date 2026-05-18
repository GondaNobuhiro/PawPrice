import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = (process.env.DATABASE_URL ?? "").replace("sslmode=require", "sslmode=verify-full");
if (!connectionString) throw new Error('DATABASE_URL is not set');

const prisma = new PrismaClient({
    adapter: new PrismaPg(new Pool({ connectionString, max: 3 })),
});

function isEan13ChecksumValid(code: string): boolean {
    const digits = code.split('').map(Number);
    const sum = digits.slice(0, 12).reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0);
    return (10 - (sum % 10)) % 10 === digits[12];
}

function extractJanFromUrl(url: string): string | null {
    const m = url.match(/(?<!\d)\d{13}(?!\d)/g);
    if (!m) return null;
    for (const candidate of m) {
        if (isEan13ChecksumValid(candidate)) return candidate;
    }
    return null;
}

const BATCH_SIZE = 500;

async function main() {
    console.log('JAN-less 商品の URL から JAN13 をバックフィル開始...');

    let offset = 0;
    let totalChecked = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;

    while (true) {
        const products = await prisma.product.findMany({
            where: { janCode: null },
            select: {
                id: true,
                offers: {
                    where: { shopType: 'rakuten', isActive: true },
                    select: { externalUrl: true },
                    take: 1,
                },
            },
            skip: offset,
            take: BATCH_SIZE,
        });

        if (products.length === 0) break;

        const updates: { id: bigint; janCode: string }[] = [];
        const jansSeen = new Set<string>();

        for (const product of products) {
            const url = product.offers[0]?.externalUrl;
            if (!url) { totalSkipped++; continue; }

            const jan = extractJanFromUrl(url);
            if (!jan) { totalSkipped++; continue; }

            if (jansSeen.has(jan)) { totalSkipped++; continue; }
            jansSeen.add(jan);
            updates.push({ id: product.id, janCode: jan });
        }

        if (updates.length > 0) {
            // 重複 JAN コードを持つ既存商品との衝突を避けるため、1件ずつ更新
            for (const { id, janCode } of updates) {
                const conflict = await prisma.product.findFirst({ where: { janCode }, select: { id: true } });
                if (conflict && conflict.id !== id) {
                    totalSkipped++;
                    continue;
                }
                await prisma.product.update({ where: { id }, data: { janCode } });
                totalUpdated++;
            }
        }

        totalChecked += products.length;
        offset += BATCH_SIZE;

        const progress = Math.round(totalChecked / 1000) * 1000;
        if (progress > 0 && totalChecked % 1000 < BATCH_SIZE) {
            console.log(`  ${totalChecked.toLocaleString()} 件確認済み / 更新: ${totalUpdated} / スキップ: ${totalSkipped}`);
        }
    }

    console.log(`\n完了: ${totalChecked.toLocaleString()} 件確認, ${totalUpdated} 件更新, ${totalSkipped} 件スキップ`);
    await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
