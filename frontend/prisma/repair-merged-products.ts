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
    const SIZE_RE = /\d+(?:\.\d+)?(?:kg|ml|g|l|m|枚|個|袋|本|pcs)|[sml]サイズ|\b(?:xs|xl|xxl)\b/;
    const keepIfSize = (content: string) => SIZE_RE.test(content) ? ` ${content} ` : ' ';
    return name
        .normalize('NFKC').toLowerCase()
        .replace(/【([^】]*)】/g, (_, c) => keepIfSize(c))
        .replace(/\[([^\]]*)\]/g, (_, c) => keepIfSize(c))
        .replace(/（([^）]*)）/g, (_, c) => keepIfSize(c))
        .replace(/\(([^)]*)\)/g, (_, c) => keepIfSize(c))
        .replace(/送料無料|送料込み|正規品|公式|最安値|限定|お買い得/g, ' ')
        .replace(/ポイント\d+倍|ポイントアップ|セール/gi, ' ')
        .replace(/税込|あす楽|翌日配送/g, ' ')
        .replace(/[|｜/／・●◆★☆※■□▲△▼▽]/g, ' ')
        .replace(/[,:：;；\-‐–—]/g, ' ')
        .replace(/[!"#$%&'*=~^`{}<>?＋+]/g, ' ')
        .replace(/\s+/g, ' ').trim();
}

// ブラケット内のセット数（N個セット、N本セット 等）を抽出
function extractBracketSetCount(name: string): string | null {
    const n = name.normalize('NFKC').toLowerCase();
    const SET_RE = /(\d+(?:個|点|本|袋|枚|箱|缶)(?:セット|入り?))/;
    for (const m of n.matchAll(/【([^】]*)】|\[([^\]]*)\]|\(([^)]*)\)/g)) {
        const content = m[1] || m[2] || m[3] || '';
        const hit = content.match(SET_RE);
        if (hit) return hit[0];
    }
    return null;
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

    // packageSizeがnullでも、商品名とofferタイトル双方からサイズを抽出して比較
    const productExtractedSize = extractPackageSize(productName);
    const offerExtractedSize = extractPackageSize(offerTitle);
    if (productExtractedSize && offerExtractedSize && productExtractedSize !== offerExtractedSize) return true;

    // ブラケット内セット数が異なる → 誤マージ（例：【3個セット】 vs 【2個セット】 or 単品）
    const productSetCount = extractBracketSetCount(productName);
    const offerSetCount = extractBracketSetCount(offerTitle);
    if (productSetCount !== offerSetCount) return true;

    return false;
}

function inferPetType(text: string): string {
    if (/犬|ドッグ|dog/i.test(text)) return 'dog';
    if (/猫|キャット|cat/i.test(text)) return 'cat';
    return 'both';
}

function extractPackageSize(name: string): string | null {
    const n = name.normalize('NFKC').toLowerCase();
    const patterns = [
        /\d+(?:\.\d+)?kg/,
        /\d+(?:\.\d+)?ml/,
        /\d+(?:\.\d+)?mg/,
        /\d+(?:\.\d+)?g(?![a-z])/,
        /\d+(?:\.\d+)?l(?![a-z])/,
        /\d+(?:\.\d+)?m(?![a-z])/,
        /\d+枚/,
        /\d+個/,
        /\d+袋/,
        /\d+本/,
        /\d+pcs/,
        /[sml]サイズ/,
        /\bxs\b|\bxl\b|\bxxl\b/,
    ];
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
    excludeProductId: bigint;  // 現在修正中の商品は候補から除外
}): Promise<bigint> {
    const normalizedName = normalizeProductName(params.title);
    const packageSize = extractPackageSize(params.title);

    const nameMatch = await prisma.product.findFirst({
        where: {
            categoryId: params.categoryId,
            petType: params.petType,
            normalizedName,
            packageSize: packageSize ?? null,
            NOT: { id: params.excludeProductId },
        },
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

    // offer移動より先にnormalizedNameを新形式に更新しておく
    // （これにより findOrCreateProductForOffer が既存商品を正しく見つけられる）
    if (!dryRun) {
        const allForNorm = await prisma.product.findMany({
            where: { isActive: true },
            select: { id: true, name: true, normalizedName: true },
        });
        let updatedNames = 0;
        for (const p of allForNorm) {
            const newNorm = normalizeProductName(p.name);
            if (newNorm !== p.normalizedName) {
                await prisma.product.update({ where: { id: p.id }, data: { normalizedName: newNorm } });
                updatedNames++;
            }
        }
        console.log(`normalizedName pre-updated: ${updatedNames}`);
    }

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
                    excludeProductId: product.id,
                });

                if (correctProductId === BigInt(-1)) {
                    console.log(`[DRY] would move offer=${offer.id} "${offer.title.slice(0, 40)}" from product=${product.id}`);
                    moved++;
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
