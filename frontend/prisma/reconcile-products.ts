import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
}

const prisma = new PrismaClient({
    adapter: new PrismaPg(new Pool({ connectionString })),
});

type ProductRecord = {
    id: bigint;
    name: string;
    normalizedName: string | null;
    janCode: string | null;
    modelNumber: string | null;
    packageSize: string | null;
    petType: string;
    imageUrl: string | null;
    brandId: bigint | null;
    isActive: boolean;
    createdAt: Date;
    brand: {
        id: bigint;
        name: string;
    } | null;
};

type DuplicateGroup = {
    matchType: 'jan' | 'brand_model';
    matchKey: string;
    products: ProductRecord[];
};

type AffectedCounts = {
    offersToMove: number;
    watchlistsToMove: number;
    notificationsToMove: number;
};

function normalizeText(value: string | null | undefined): string {
    if (!value) {
        return '';
    }

    return value
        .normalize('NFKC')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}

function scoreProductForMaster(product: ProductRecord): number {
    let score = 0;

    if (product.janCode) score += 100;
    if (product.brandId) score += 40;
    if (product.modelNumber) score += 30;
    if (product.packageSize) score += 20;
    if (product.imageUrl) score += 10;
    if (product.isActive) score += 5;

    const normalizedName = normalizeText(product.name);
    if (normalizedName.length >= 10) score += 5;

    return score;
}

function chooseMasterProduct(products: ProductRecord[]): ProductRecord {
    const sorted = [...products].sort((a, b) => {
        const scoreDiff = scoreProductForMaster(b) - scoreProductForMaster(a);
        if (scoreDiff !== 0) {
            return scoreDiff;
        }

        const createdAtDiff = a.createdAt.getTime() - b.createdAt.getTime();
        if (createdAtDiff !== 0) {
            return createdAtDiff;
        }

        return Number(a.id - b.id);
    });

    return sorted[0];
}

function isSafeJanGroup(products: ProductRecord[]): boolean {
    const petTypes = new Set(
        products
            .map((p) => p.petType)
            .filter((petType) => petType && petType !== 'both'),
    );

    if (petTypes.size > 1) {
        return false;
    }

    const packageSizes = new Set(
        products
            .map((p) => normalizeText(p.packageSize))
            .filter(Boolean),
    );

    return packageSizes.size <= 1;
}

function isSafeBrandModelGroup(products: ProductRecord[]): boolean {
    const petTypes = new Set(
        products
            .map((p) => p.petType)
            .filter((petType) => petType && petType !== 'both'),
    );

    if (petTypes.size > 1) {
        return false;
    }

    const packageSizes = new Set(
        products
            .map((p) => normalizeText(p.packageSize))
            .filter(Boolean),
    );

    if (packageSizes.size > 1) {
        return false;
    }

    const normalizedNames = products
        .map((p) => normalizeText(p.normalizedName ?? p.name))
        .filter(Boolean);

    if (normalizedNames.length <= 1) {
        return true;
    }

    const base = normalizedNames[0];
    return normalizedNames.every(
        (name) => name.includes(base) || base.includes(name),
    );
}

async function findJanDuplicateGroups(): Promise<DuplicateGroup[]> {
    const janGroups = await prisma.product.groupBy({
        by: ['janCode'],
        where: {
            isActive: true,
            janCode: {
                not: null,
            },
        },
        _count: {
            janCode: true,
        },
        having: {
            janCode: {
                _count: {
                    gt: 1,
                },
            },
        },
    });

    const groups: DuplicateGroup[] = [];

    for (const group of janGroups) {
        if (!group.janCode) continue;

        const products = await prisma.product.findMany({
            where: {
                isActive: true,
                janCode: group.janCode,
            },
            include: {
                brand: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'asc',
            },
        });

        groups.push({
            matchType: 'jan',
            matchKey: group.janCode,
            products,
        });
    }

    return groups;
}

async function findBrandModelDuplicateGroups(
    excludedProductIds: bigint[],
): Promise<DuplicateGroup[]> {
    const groupsRaw = await prisma.product.groupBy({
        by: ['brandId', 'modelNumber'],
        where: {
            isActive: true,
            brandId: {
                not: null,
            },
            modelNumber: {
                not: null,
            },
            id: {
                notIn: excludedProductIds,
            },
        },
        _count: {
            modelNumber: true,
        },
        having: {
            modelNumber: {
                _count: {
                    gt: 1,
                },
            },
        },
    });

    const groups: DuplicateGroup[] = [];

    for (const group of groupsRaw) {
        if (!group.brandId || !group.modelNumber) continue;

        const products = await prisma.product.findMany({
            where: {
                isActive: true,
                brandId: group.brandId,
                modelNumber: group.modelNumber,
            },
            include: {
                brand: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'asc',
            },
        });

        groups.push({
            matchType: 'brand_model',
            matchKey: `${group.brandId.toString()}::${group.modelNumber}`,
            products,
        });
    }

    return groups;
}

async function countAffectedRelations(
    masterId: bigint,
    duplicateIds: bigint[],
): Promise<AffectedCounts> {
    const offersToMove = await prisma.productOffer.count({
        where: {
            productId: {
                in: duplicateIds,
            },
        },
    });

    let watchlistsToMove = 0;
    let notificationsToMove = 0;

    try {
        watchlistsToMove = await prisma.watchlist.count({
            where: {
                productId: {
                    in: duplicateIds,
                },
            },
        });
    } catch {
        watchlistsToMove = 0;
    }

    try {
        notificationsToMove = await prisma.notification.count({
            where: {
                productId: {
                    in: duplicateIds,
                },
            },
        });
    } catch {
        notificationsToMove = 0;
    }

    return {
        offersToMove,
        watchlistsToMove,
        notificationsToMove,
    };
}

function printGroupReport(params: {
    group: DuplicateGroup;
    master: ProductRecord;
    duplicates: ProductRecord[];
    affected: AffectedCounts;
    safeToMerge: boolean;
}) {
    const { group, master, duplicates, affected, safeToMerge } = params;

    console.log('');
    console.log(
        `[RECONCILE][${group.matchType.toUpperCase()}] matchKey=${group.matchKey}`,
    );
    console.log(`safeToMerge=${safeToMerge}`);
    console.log(
        `master=${master.id.toString()} "${master.name}"` +
        ` / brand=${master.brand?.name ?? '-'} / jan=${master.janCode ?? '-'} / model=${master.modelNumber ?? '-'} / package=${master.packageSize ?? '-'}`,
    );
    console.log('duplicates=');

    for (const duplicate of duplicates) {
        console.log(
            `- ${duplicate.id.toString()} "${duplicate.name}"` +
            ` / brand=${duplicate.brand?.name ?? '-'} / jan=${duplicate.janCode ?? '-'} / model=${duplicate.modelNumber ?? '-'} / package=${duplicate.packageSize ?? '-'}`,
        );
    }

    console.log(
        `offersToMove=${affected.offersToMove}, watchlistsToMove=${affected.watchlistsToMove}, notificationsToMove=${affected.notificationsToMove}`,
    );
}

async function main() {
    const janGroups = await findJanDuplicateGroups();
    const janProductIds = janGroups.flatMap((group) =>
        group.products.map((product) => product.id),
    );

    const brandModelGroups = await findBrandModelDuplicateGroups(janProductIds);

    console.log(`jan duplicate groups: ${janGroups.length}`);
    console.log(`brand/model duplicate groups: ${brandModelGroups.length}`);

    let janSafeGroups = 0;
    let brandModelSafeGroups = 0;
    let totalOffersToMove = 0;
    let totalWatchlistsToMove = 0;
    let totalNotificationsToMove = 0;

    for (const group of janGroups) {
        const safeToMerge = isSafeJanGroup(group.products);
        if (!safeToMerge) {
            printGroupReport({
                group,
                master: chooseMasterProduct(group.products),
                duplicates: group.products.filter(
                    (p) => p.id !== chooseMasterProduct(group.products).id,
                ),
                affected: {
                    offersToMove: 0,
                    watchlistsToMove: 0,
                    notificationsToMove: 0,
                },
                safeToMerge,
            });
            continue;
        }

        janSafeGroups += 1;

        const master = chooseMasterProduct(group.products);
        const duplicates = group.products.filter((p) => p.id !== master.id);
        const affected = await countAffectedRelations(
            master.id,
            duplicates.map((p) => p.id),
        );

        totalOffersToMove += affected.offersToMove;
        totalWatchlistsToMove += affected.watchlistsToMove;
        totalNotificationsToMove += affected.notificationsToMove;

        printGroupReport({
            group,
            master,
            duplicates,
            affected,
            safeToMerge,
        });
    }

    for (const group of brandModelGroups) {
        const safeToMerge = isSafeBrandModelGroup(group.products);
        if (!safeToMerge) {
            printGroupReport({
                group,
                master: chooseMasterProduct(group.products),
                duplicates: group.products.filter(
                    (p) => p.id !== chooseMasterProduct(group.products).id,
                ),
                affected: {
                    offersToMove: 0,
                    watchlistsToMove: 0,
                    notificationsToMove: 0,
                },
                safeToMerge,
            });
            continue;
        }

        brandModelSafeGroups += 1;

        const master = chooseMasterProduct(group.products);
        const duplicates = group.products.filter((p) => p.id !== master.id);
        const affected = await countAffectedRelations(
            master.id,
            duplicates.map((p) => p.id),
        );

        totalOffersToMove += affected.offersToMove;
        totalWatchlistsToMove += affected.watchlistsToMove;
        totalNotificationsToMove += affected.notificationsToMove;

        printGroupReport({
            group,
            master,
            duplicates,
            affected,
            safeToMerge,
        });
    }

    console.log('');
    console.log('reconcile dry-run done');
    console.log({
        janGroups: janGroups.length,
        janSafeGroups,
        brandModelGroups: brandModelGroups.length,
        brandModelSafeGroups,
        totalOffersToMove,
        totalWatchlistsToMove,
        totalNotificationsToMove,
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