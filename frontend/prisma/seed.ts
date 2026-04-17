import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    await prisma.user.upsert({
        where: { email: 'demo@example.com' },
        update: {},
        create: {
            email: 'demo@example.com',
            displayName: 'demo user',
        },
    });

    const categories = [
        { code: 'dog_cat_food', name: '犬猫のフード' },
        { code: 'toilet_supplies', name: 'トイレ用品' },
        { code: 'pet_sheets', name: 'ペットシーツ' },
        { code: 'snacks', name: 'おやつ' },
        { code: 'cat_litter', name: '猫砂' },
        { code: 'toilet_main_unit', name: 'トイレ本体' },
        { code: 'water_feeders', name: '給水器' },
        { code: 'feeding_bowls', name: '食器' },
        { code: 'cages', name: 'ケージ' },
        { code: 'carriers', name: 'キャリーバッグ' },
        { code: 'toys', name: 'おもちゃ' },
        { code: 'scratchers', name: '爪とぎ' },
        { code: 'deodorizers', name: '消臭用品' },
    ] as const;

    for (const category of categories) {
        await prisma.category.upsert({
            where: { code: category.code },
            update: {
                name: category.name,
            },
            create: {
                code: category.code,
                name: category.name,
            },
        });
    }

    const brands = [
        { name: 'ロイヤルカナン' },
        { name: 'ユニ・チャーム' },
        { name: '花王' },
        { name: 'アイリスオーヤマ' },
        { name: 'ライオンペット' },
        { name: 'ペティオ' },
    ] as const;

    for (const brand of brands) {
        await prisma.brand.upsert({
            where: { name: brand.name },
            update: {},
            create: {
                name: brand.name,
            },
        });
    }

    console.log('seed completed');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });