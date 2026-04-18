import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
const applicationId = process.env.RAKUTEN_APPLICATION_ID;
const accessKey = process.env.RAKUTEN_ACCESS_KEY;
const affiliateId = process.env.RAKUTEN_AFFILIATE_ID;
const productSearchBaseUrl =
    process.env.RAKUTEN_PRODUCT_SEARCH_API_BASE_URL ||
    'https://openapi.rakuten.co.jp/ichibaps/api/IchibaProduct/Search/20240301';

if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
}
if (!applicationId) {
    throw new Error('RAKUTEN_APPLICATION_ID is not set');
}
if (!accessKey) {
    throw new Error('RAKUTEN_ACCESS_KEY is not set');
}

const prisma = new PrismaClient({
    adapter: new PrismaPg(new Pool({ connectionString })),
});

const TARGET_LIMIT = 100;
const SEARCH_HITS = 10;
const MIN_ACCEPT_SCORE_FOR_BRAND = 65;
const MIN_ACCEPT_SCORE_FOR_MODEL = 75;
const MIN_ACCEPT_SCORE_FOR_JAN = 80;
const MIN_SCORE_GAP = 10;

type ProductSearchRaw =
    | {
    productName?: string;
    productCode?: string;
    productNo?: string;
    brandName?: string;
    genreName?: string;
    imageUrl?: string;
    Product?: {
        productName?: string;
        productCode?: string;
        productNo?: string;
        brandName?: string;
        genreName?: string;
        imageUrl?: string;
    };
}
    | null
    | undefined;

type ProductSearchItem = {
    productName: string;
    productCode: string | null;
    productNo: string | null;
    brandName: string | null;
    genreName: string | null;
    imageUrl: string | null;
};

type ProductSearchResponse = {
    Products?: ProductSearchRaw[];
    products?: ProductSearchRaw[];
};

type EnrichTarget = {
    id: bigint;
    name: string;
    normalizedName: string | null;
    janCode: string | null;
    modelNumber: string | null;
    packageSize: string | null;
    petType: string;
    imageUrl: string | null;
    brandId: bigint | null;
    category: {
        id: bigint;
        name: string;
        code: string;
    };
    brand: {
        id: bigint;
        name: string;
    } | null;
};

type CandidateScore = {
    candidate: ProductSearchItem;
    score: number;
    reasons: string[];
};

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeText(value: string | null | undefined): string {
    if (!value) {
        return '';
    }

    return value
        .normalize('NFKC')
        .toLowerCase()
        .replace(/【[^】]*】/g, ' ')
        .replace(/\[[^\]]*]/g, ' ')
        .replace(/（[^）]*）/g, ' ')
        .replace(/\([^)]*\)/g, ' ')
        .replace(/送料無料/g, ' ')
        .replace(/送料込み/g, ' ')
        .replace(/送料お得/g, ' ')
        .replace(/送料込/g, ' ')
        .replace(/正規品/g, ' ')
        .replace(/公式/g, ' ')
        .replace(/最安値/g, ' ')
        .replace(/限定/g, ' ')
        .replace(/お買い得/g, ' ')
        .replace(/ポイント\d+倍/g, ' ')
        .replace(/ポイントアップ/g, ' ')
        .replace(/セール/g, ' ')
        .replace(/sale/gi, ' ')
        .replace(/税込/g, ' ')
        .replace(/あす楽/g, ' ')
        .replace(/翌日配送/g, ' ')
        .replace(/イチオシ/g, ' ')
        .replace(/同梱不可/g, ' ')
        .replace(/即納在庫品/g, ' ')
        .replace(/メール便対応/g, ' ')
        .replace(/メール便不可/g, ' ')
        .replace(/メール便/g, ' ')
        .replace(/激安販売中!/g, ' ')
        .replace(/ふるさと納税/g, ' ')
        .replace(/即日出荷/g, ' ')
        .replace(/即日発送/g, ' ')
        .replace(/受注生産/g, ' ')
        .replace(/取寄品/g, ' ')
        .replace(/おすすめ/g, ' ')
        .replace(/人気/g, ' ')
        .replace(/まとめ買い/g, ' ')
        .replace(/直送品/g, ' ')
        .replace(/[|｜/／・○●◇◆☆★※■□▲△▼▽]/g, ' ')
        .replace(/[,:：;；]/g, ' ')
        .replace(/[-‐-‒–—―]/g, ' ')
        .replace(/[!"#$%&'*=~^`{}<>?＋+]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function buildSearchQuery(name: string): string {
    return normalizeText(name)
        .replace(/\b(?:犬|猫|ドッグ|キャット)\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function tokenize(value: string): string[] {
    return normalizeText(value)
        .split(/\s+/)
        .map((token) => token.trim())
        .filter(Boolean)
        .filter((token) => token.length >= 2);
}

function extractPackageSize(name: string | null | undefined): string | null {
    if (!name) {
        return null;
    }

    const normalized = name.normalize('NFKC').toLowerCase();

    const patterns = [
        /\b\d+(?:\.\d+)?kg\b/,
        /\b\d+(?:\.\d+)?g\b/,
        /\b\d+(?:\.\d+)?l\b/,
        /\b\d+(?:\.\d+)?ml\b/,
        /\b\d+枚\b/,
        /\b\d+個\b/,
        /\b\d+袋\b/,
        /\b\d+本\b/,
        /\b\d+pcs\b/,
    ];

    for (const pattern of patterns) {
        const match = normalized.match(pattern);
        if (match) {
            return match[0];
        }
    }

    return null;
}

function extractJanCode(text: string | null | undefined): string | null {
    if (!text) {
        return null;
    }

    const normalized = text.normalize('NFKC');

    const jan13Matches = normalized.match(/(?<!\d)\d{13}(?!\d)/g);
    if (jan13Matches && jan13Matches.length > 0) {
        return jan13Matches[0];
    }

    const jan8Matches = normalized.match(/(?<!\d)\d{8}(?!\d)/g);
    if (jan8Matches && jan8Matches.length > 0) {
        return jan8Matches[0];
    }

    return null;
}

function extractModelNumber(text: string | null | undefined): string | null {
    if (!text) {
        return null;
    }

    const normalized = text.normalize('NFKC');

    const patterns = [
        /\b[A-Z]{1,6}[-‐]?[A-Z0-9]{2,}\b/gi,
        /\b[A-Z]+[-‐]?\d{4,}[A-Z0-9-]*\b/gi,
        /\b[A-Z]{2,}\d{2,}[A-Z0-9-]*\b/gi,
    ];

    const candidates = patterns.flatMap(
        (pattern) => normalized.match(pattern) ?? [],
    );

    if (candidates.length === 0) {
        return null;
    }

    const excludedWords = new Set(['kg', 'ml', 'pcs', 'sale']);

    const filtered = candidates
        .map((value) => value.trim())
        .filter((value) => value.length >= 4)
        .filter((value) => !excludedWords.has(value.toLowerCase()));

    if (filtered.length === 0) {
        return null;
    }

    filtered.sort((a, b) => b.length - a.length);

    return filtered[0];
}

function inferPetType(text: string): string {
    if (/犬|ドッグ|dog/i.test(text)) return 'dog';
    if (/猫|キャット|cat/i.test(text)) return 'cat';
    return 'both';
}

function normalizeProductSearchItems(rawItems: ProductSearchRaw[]): ProductSearchItem[] {
    const result: ProductSearchItem[] = [];

    for (const raw of rawItems) {
        if (!raw) continue;

        const base = raw.Product ?? raw;

        if (!base.productName) {
            continue;
        }

        result.push({
            productName: base.productName,
            productCode: base.productCode ?? null,
            productNo: base.productNo ?? null,
            brandName: base.brandName ?? null,
            genreName: base.genreName ?? null,
            imageUrl: base.imageUrl ?? null,
        });
    }

    return result;
}

async function fetchProductSearchCandidates(
    keyword: string,
    retryCount = 0,
): Promise<ProductSearchItem[]> {
    const params = new URLSearchParams();
    params.set('applicationId', applicationId!);
    params.set('accessKey', accessKey!);
    params.set('format', 'json');
    params.set('keyword', keyword);
    params.set('hits', String(SEARCH_HITS));

    if (affiliateId) {
        params.set('affiliateId', affiliateId);
    }

    const url = `${productSearchBaseUrl}?${params.toString()}`;

    try {
        const res = await fetch(url, {
            headers: {
                Referer: 'https://pawprice.vercel.app/',
                Origin: 'https://pawprice.vercel.app',
                'User-Agent': 'PawPrice/0.1',
            },
        });

        const text = await res.text();

        if (res.status === 429) {
            if (retryCount >= 5) {
                console.error('product search status=', res.status);
                console.error(text);
                throw new Error('Product Search API rate limit exceeded after retries');
            }

            console.warn(
                `Product Search API rate limit hit. keyword=${keyword}, retry=${retryCount + 1}`,
            );
            await sleep(3000 + retryCount * 1000);
            return fetchProductSearchCandidates(keyword, retryCount + 1);
        }

        if (!res.ok) {
            console.error('product search status=', res.status);
            console.error(text);
            throw new Error(`Product Search API failed: ${res.status}`);
        }

        const data = JSON.parse(text) as ProductSearchResponse;
        const rawItems = Array.isArray(data.products)
            ? data.products
            : Array.isArray(data.Products)
                ? data.Products
                : [];

        return normalizeProductSearchItems(rawItems);
    } catch (error) {
        if (retryCount >= 5) {
            throw error;
        }

        console.warn(
            `Product Search API network error. keyword=${keyword}, retry=${retryCount + 1}`,
            error,
        );
        await sleep(3000 + retryCount * 1000);
        return fetchProductSearchCandidates(keyword, retryCount + 1);
    }
}

function getTokenOverlapScore(source: string, target: string): number {
    const sourceTokens = tokenize(source);
    const targetTokens = tokenize(target);

    if (sourceTokens.length === 0 || targetTokens.length === 0) {
        return 0;
    }

    const targetSet = new Set(targetTokens);
    const matched = sourceTokens.filter((token) => targetSet.has(token)).length;
    const ratio = matched / sourceTokens.length;

    if (ratio >= 0.9) return 35;
    if (ratio >= 0.7) return 28;
    if (ratio >= 0.5) return 18;
    if (ratio >= 0.3) return 8;
    return 0;
}

function scoreCandidate(
    product: EnrichTarget,
    candidate: ProductSearchItem,
): CandidateScore {
    let score = 0;
    const reasons: string[] = [];

    const sourceName = product.name;
    const targetName = candidate.productName;

    const normalizedSource = normalizeText(sourceName);
    const normalizedTarget = normalizeText(targetName);

    if (normalizedSource === normalizedTarget) {
        score += 40;
        reasons.push('name_exact');
    } else if (
        normalizedSource.includes(normalizedTarget) ||
        normalizedTarget.includes(normalizedSource)
    ) {
        score += 30;
        reasons.push('name_contains');
    } else {
        const tokenScore = getTokenOverlapScore(sourceName, targetName);
        score += tokenScore;
        if (tokenScore > 0) {
            reasons.push(`token_overlap_${tokenScore}`);
        }
    }

    const sourcePackage = product.packageSize ?? extractPackageSize(sourceName);
    const targetPackage = extractPackageSize(candidate.productName);

    if (sourcePackage && targetPackage) {
        if (sourcePackage === targetPackage) {
            score += 20;
            reasons.push('package_match');
        } else {
            score -= 30;
            reasons.push('package_mismatch');
        }
    }

    const sourcePetType = product.petType;
    const targetPetType = inferPetType(
        [candidate.productName, candidate.genreName ?? ''].join(' '),
    );

    if (
        sourcePetType !== 'both' &&
        targetPetType !== 'both' &&
        sourcePetType === targetPetType
    ) {
        score += 10;
        reasons.push('pet_type_match');
    } else if (
        sourcePetType !== 'both' &&
        targetPetType !== 'both' &&
        sourcePetType !== targetPetType
    ) {
        score -= 25;
        reasons.push('pet_type_mismatch');
    }

    const sourceBrandName = product.brand?.name ?? null;
    const targetBrandName = candidate.brandName;

    if (sourceBrandName && targetBrandName) {
        if (normalizeText(sourceBrandName) === normalizeText(targetBrandName)) {
            score += 20;
            reasons.push('brand_match');
        } else {
            score -= 20;
            reasons.push('brand_mismatch');
        }
    } else if (
        !sourceBrandName &&
        targetBrandName &&
        normalizeText(sourceName).includes(normalizeText(targetBrandName))
    ) {
        score += 10;
        reasons.push('brand_in_name');
    }

    const sourceModel = product.modelNumber ?? extractModelNumber(sourceName);
    const targetModel =
        candidate.productNo ?? extractModelNumber(candidate.productName);

    if (sourceModel && targetModel) {
        if (normalizeText(sourceModel) === normalizeText(targetModel)) {
            score += 30;
            reasons.push('model_match');
        } else {
            score -= 10;
            reasons.push('model_mismatch');
        }
    }

    if (candidate.genreName) {
        const normalizedGenre = normalizeText(candidate.genreName);
        const normalizedCategory = normalizeText(product.category.name);

        if (
            normalizedGenre.includes(normalizedCategory) ||
            normalizedCategory.includes(normalizedGenre)
        ) {
            score += 5;
            reasons.push('genre_match');
        }
    }

    return {
        candidate,
        score,
        reasons,
    };
}

async function findOrCreateBrand(brandName: string): Promise<bigint> {
    const existing = await prisma.brand.findFirst({
        where: {
            name: brandName,
        },
        select: {
            id: true,
        },
    });

    if (existing) {
        return existing.id;
    }

    const created = await prisma.brand.create({
        data: {
            name: brandName,
        },
        select: {
            id: true,
        },
    });

    return created.id;
}

async function main() {
    const targets = await prisma.product.findMany({
        where: {
            isActive: true,
            OR: [
                { janCode: null },
                { brandId: null },
                { modelNumber: null },
            ],
        },
        include: {
            category: {
                select: {
                    id: true,
                    name: true,
                    code: true,
                },
            },
            brand: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
        orderBy: {
            id: 'asc',
        },
        take: TARGET_LIMIT,
    });

    console.log(`enrich targets: ${targets.length}`);

    let updatedJan = 0;
    let updatedBrand = 0;
    let updatedModel = 0;
    let skippedNoCandidates = 0;
    let skippedLowScore = 0;
    let processed = 0;

    for (const product of targets) {
        processed += 1;

        const keyword = buildSearchQuery(product.name);
        if (!keyword) {
            console.warn(`skip product=${product.id.toString()} because keyword empty`);
            continue;
        }

        console.log(
            `enrich product=${product.id.toString()} name=${product.name} keyword=${keyword}`,
        );

        const candidates = await fetchProductSearchCandidates(keyword);

        if (candidates.length === 0) {
            skippedNoCandidates += 1;
            console.log(`no candidates for product=${product.id.toString()}`);
            await sleep(1200);
            continue;
        }

        const scored = candidates
            .map((candidate) => scoreCandidate(product, candidate))
            .sort((a, b) => b.score - a.score);

        const best = scored[0];
        const second = scored[1] ?? null;
        const scoreGap = second ? best.score - second.score : 999;

        console.log(
            JSON.stringify(
                {
                    productId: product.id.toString(),
                    bestScore: best.score,
                    secondScore: second?.score ?? null,
                    scoreGap,
                    bestCandidate: {
                        productName: best.candidate.productName,
                        brandName: best.candidate.brandName,
                        productCode: best.candidate.productCode,
                        productNo: best.candidate.productNo,
                        reasons: best.reasons,
                    },
                },
                null,
                2,
            ),
        );

        if (best.score < MIN_ACCEPT_SCORE_FOR_BRAND || scoreGap < MIN_SCORE_GAP) {
            skippedLowScore += 1;
            console.log(
                `skip product=${product.id.toString()} because score too low or ambiguous`,
            );
            await sleep(1200);
            continue;
        }

        const updates: {
            janCode?: string;
            brandId?: bigint;
            modelNumber?: string;
            imageUrl?: string;
        } = {};

        const candidateJan =
            best.candidate.productCode ?? extractJanCode(best.candidate.productName);
        const candidateBrand = best.candidate.brandName;
        const candidateModel =
            best.candidate.productNo ?? extractModelNumber(best.candidate.productName);

        if (
            !product.janCode &&
            candidateJan &&
            best.score >= MIN_ACCEPT_SCORE_FOR_JAN &&
            scoreGap >= MIN_SCORE_GAP
        ) {
            updates.janCode = candidateJan;
        }

        if (
            !product.brandId &&
            candidateBrand &&
            best.score >= MIN_ACCEPT_SCORE_FOR_BRAND
        ) {
            updates.brandId = await findOrCreateBrand(candidateBrand);
        }

        if (
            !product.modelNumber &&
            candidateModel &&
            best.score >= MIN_ACCEPT_SCORE_FOR_MODEL
        ) {
            updates.modelNumber = candidateModel;
        }

        if (!product.imageUrl && best.candidate.imageUrl) {
            updates.imageUrl = best.candidate.imageUrl;
        }

        if (Object.keys(updates).length === 0) {
            console.log(`no updates for product=${product.id.toString()}`);
            await sleep(1200);
            continue;
        }

        await prisma.product.update({
            where: {
                id: product.id,
            },
            data: updates,
        });

        if (updates.janCode) updatedJan += 1;
        if (updates.brandId) updatedBrand += 1;
        if (updates.modelNumber) updatedModel += 1;

        console.log(
            `updated product=${product.id.toString()} updates=${JSON.stringify({
                janCode: updates.janCode ?? null,
                brandId: updates.brandId?.toString() ?? null,
                modelNumber: updates.modelNumber ?? null,
            })}`,
        );

        await sleep(1500);
    }

    console.log('enrich done');
    console.log({
        processed,
        updatedJan,
        updatedBrand,
        updatedModel,
        skippedNoCandidates,
        skippedLowScore,
    });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });