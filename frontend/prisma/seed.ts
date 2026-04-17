import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

// 1. Instantiate the driver
const pool = new Pool({ connectionString });

// 2. Instantiate the adapter
const adapter = new PrismaPg(pool);

// 3. Pass the adapter option to the Prisma Client
const prisma = new PrismaClient({ adapter });

async function main() {

    const user = await prisma.user.upsert({
        where: { email: 'demo@example.com' },
        update: {},
        create: {
            email: 'demo@example.com',
            displayName: 'demo user',
        },
    });

    const foodCategory = await prisma.category.upsert({
        where: { code: 'dog_cat_food' },
        update: {},
        create: {
            code: 'dog_cat_food',
            name: '犬猫のフード',
        },
    });

    const brand = await prisma.brand.upsert({
        where: { name: 'ロイヤルカナン' },
        update: {},
        create: {
            name: 'ロイヤルカナン',
        },
    });

    const product = await prisma.product.create({
        data: {
            category: {
                connect: { id: foodCategory.id },
            },
            brand: {
                connect: { id: brand.id },
            },
            name: 'ロイヤルカナン 室内成猫用 2kg',
            normalizedName: 'ロイヤルカナン 室内成猫用 2kg',
            janCode: '1234567890123',
            petType: 'cat',
            packageSize: '2kg',
            imageUrl: 'https://example.com/product.jpg',
            description: '室内で暮らす成猫向けフード',
            offers: {
                create: [
                    {
                        shopType: 'amazon',
                        externalItemId: 'AMAZON_SAMPLE_001',
                        externalUrl: 'https://amazon.example/item1',
                        title: 'ロイヤルカナン 室内成猫用 2kg',
                        sellerName: 'Amazon',
                        price: 2980,
                        shippingFee: 0,
                        pointAmount: 0,
                        effectivePrice: 2980,
                        availabilityStatus: 'in_stock',
                        imageUrl: 'https://example.com/product.jpg',
                        lastFetchedAt: new Date(),
                        priceHistories: {
                            create: [
                                {
                                    price: 2980,
                                    shippingFee: 0,
                                    pointAmount: 0,
                                    effectivePrice: 2980,
                                    fetchedAt: new Date(),
                                },
                            ],
                        },
                    },
                    {
                        shopType: 'rakuten',
                        externalItemId: 'RAKUTEN_SAMPLE_001',
                        externalUrl: 'https://rakuten.example/item1',
                        title: 'ロイヤルカナン 室内成猫用 2kg',
                        sellerName: '楽天市場',
                        price: 3100,
                        shippingFee: 0,
                        pointAmount: 100,
                        effectivePrice: 3000,
                        availabilityStatus: 'in_stock',
                        imageUrl: 'https://example.com/product.jpg',
                        lastFetchedAt: new Date(),
                        priceHistories: {
                            create: [
                                {
                                    price: 3100,
                                    shippingFee: 0,
                                    pointAmount: 100,
                                    effectivePrice: 3000,
                                    fetchedAt: new Date(),
                                },
                            ],
                        },
                    },
                ],
            },
        },
    });

    console.log('seed completed:', product.id.toString());
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });