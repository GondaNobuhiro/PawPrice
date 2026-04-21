import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const prisma = new PrismaClient({
    adapter: new PrismaPg(new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 2,
        idleTimeoutMillis: 60000,
        connectionTimeoutMillis: 10000,
    })),
});

const dryRun = process.argv.includes('--dry-run');

function normalizeProductName(name: string | null | undefined): string {
    if (!name) return '';
    return name
        .normalize('NFKC').toLowerCase()
        .replace(/【[^】]*】/g, ' ').replace(/\[[^\]]*]/g, ' ')
        .replace(/（[^）]*）/g, ' ').replace(/\([^)]*\)/g, ' ')
        .replace(/送料無料|送料込み|正規品|公式|最安値|限定|お買い得/g, ' ')
        .replace(/ポイント\d+倍|ポイントアップ|セール/gi, ' ')
        .replace(/税込|あす楽|翌日配送/g, ' ')
        .replace(/[|｜/／・●◆★☆※■□▲△▼▽]/g, ' ')
        .replace(/[,:：;；\-‐–—]/g, ' ')
        .replace(/[!"#$%&'*=~^`{}<>?＋+]/g, ' ')
        .replace(/\s+/g, ' ').trim();
}

function isMismatch(productName: string, packageSize: string | null, offerTitle: string): boolean {
    const pNorm = productName.normalize('NFKC').toLowerCase();
    const oNorm = offerTitle.normalize('NFKC').toLowerCase();

    // 商品名の最初の単語（ブランド名相当）がofferタイトルにない → 誤マージ
    const firstWord = pNorm.split(/\s+/).find(w => w.length >= 2);
    if (firstWord && !oNorm.includes(firstWord)) return true;

    // packageSizeが異なる → 誤マージ
    if (packageSize) {
        const sizeNorm = packageSize.normalize('NFKC').toLowerCase();
        if (!oNorm.includes(sizeNorm)) return true;
    }

    return false;
}

function inferPetType(text: string): string {
    if (/犬|ドッグ|dog/i.test(text)) return 'dog';
    if (/猫|キャット|cat/i.test(text)) return 'cat';
    return 'both';
}

function extractPackageSize(name: string): string | null {
    const n = name.normalize('NFKC').toLowerCase();
    const patterns = [/\b\d+(?:\.\d+)?kg\b/, /\b\d+(?:\.\d+)?g\b/, /\b\d+(?:\.\d+)?l\b/,
        /\b\d+(?:\.\d+)?ml\b/, /\b\d+枚\b/, /\b\d+個\b/, /\b\d+袋\b/, /\b\d+本\b/];
    for (const p of patterns) {
        const m = n.match(p);
        if (m) return m[0];
    }
    return null;
}

async function findOrCreateProductForOffer(params: {
    categoryId: bigint;
    title: string;
    petType: string;
    imageUrl: string | null;
}): Promise<bigint> {
    const normalizedName = normalizeProductName(params.title);
    const packageSize = extractPackageSize(params.title);

    const nameMatch = await prisma.product.findFirst({
        where: { categoryId: params.categoryId, petType: params.petType, normalizedName },
        select: { id: true },
    });
    if (nameMatch) return nameMatch.id;

    if (dryRun) return BigInt(-1);

    const created = await prisma.product.create({
        data: {
            category: { connect: { id: params.categoryId } },
            name: params.title,
            normalizedName,
            petType: params.petType,
            packageSize,
            imageUrl: params.imageUrl,
            isActive: true,
        },
        select: { id: true },
    });
    return created.id;
}

async function main() {
    console.log(`dryRun=${dryRun}`);

    const products = await prisma.product.findMany({
        where: { isActive: true },
        select: {
            id: true,
            name: true,
            packageSize: true,
            categoryId: true,
            offers: {
                where: { isActive: true },
                select: { id: true, title: true, imageUrl: true },
            },
        },
    });

    let moved = 0;
    let skipped = 0;
    let errors = 0;

    for (const product of products) {
        if (product.offers.length < 2) continue;

        for (const offer of product.offers) {
            if (!isMismatch(product.name, product.packageSize, offer.title)) continue;

            const petType = inferPetType(offer.title);

            try {
                const correctProductId = await findOrCreateProductForOffer({
                    categoryId: product.categoryId,
                    title: offer.title,
                    petType,
                    imageUrl: offer.imageUrl,
                });

                if (correctProductId === BigInt(-1)) {
                    console.log(`[DRY] would move offer=${offer.id} "${offer.title.slice(0, 40)}" from product=${product.id}`);
                    moved++;
                    continue;
                }

                if (correctProductId === product.id) {
                    skipped++;
                    continue;
                }

                await prisma.productOffer.update({
                    where: { id: offer.id },
                    data: { productId: correctProductId },
                });
                console.log(`[MOVED] offer=${offer.id} "${offer.title.slice(0, 40)}" → product=${correctProductId}`);
                moved++;
            } catch (e) {
                console.error(`[ERROR] offer=${offer.id}`, e);
                errors++;
            }
        }
    }

    // 0件offerになった商品を非アクティブ化
    if (!dryRun) {
        const orphaned = await prisma.product.updateMany({
            where: {
                isActive: true,
                offers: { none: { isActive: true } },
            },
            data: { isActive: false },
        });
        console.log(`orphaned products deactivated: ${orphaned.count}`);
    }

    console.log('\nrepair-merged-products done');
    console.log({ dryRun, moved, skipped, errors });
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());