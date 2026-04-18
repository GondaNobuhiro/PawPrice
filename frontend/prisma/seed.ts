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
        { name: 'ヒルズ' },
        { name: 'ニュートロ' },
        { name: 'ピュリナ' },
        { name: 'シーバ' },
        { name: 'カルカン' },
        { name: 'いなば' },
        { name: 'デオトイレ' },
        { name: 'デオシート' },
        { name: 'ニャンとも清潔トイレ' },
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

    const brandRules = [
        { brandName: 'ロイヤルカナン', keyword: 'ロイヤルカナン', priority: 10 },
        { brandName: 'ロイヤルカナン', keyword: 'royal canin', priority: 20 },

        { brandName: 'ユニ・チャーム', keyword: 'ユニ・チャーム', priority: 10 },
        { brandName: 'ユニ・チャーム', keyword: 'unicharm', priority: 20 },

        { brandName: '花王', keyword: '花王', priority: 10 },

        { brandName: 'アイリスオーヤマ', keyword: 'アイリスオーヤマ', priority: 10 },
        { brandName: 'アイリスオーヤマ', keyword: 'iris ohyama', priority: 20 },

        { brandName: 'ライオンペット', keyword: 'ライオンペット', priority: 10 },
        { brandName: 'ライオンペット', keyword: 'lion pet', priority: 20 },

        { brandName: 'ペティオ', keyword: 'ペティオ', priority: 10 },
        { brandName: 'ペティオ', keyword: 'petio', priority: 20 },

        { brandName: 'ヒルズ', keyword: 'ヒルズ', priority: 10 },
        { brandName: 'ヒルズ', keyword: "hill's", priority: 20 },
        { brandName: 'ヒルズ', keyword: 'science diet', priority: 30 },

        { brandName: 'ニュートロ', keyword: 'ニュートロ', priority: 10 },
        { brandName: 'ニュートロ', keyword: 'nutro', priority: 20 },

        { brandName: 'ピュリナ', keyword: 'ピュリナ', priority: 10 },
        { brandName: 'ピュリナ', keyword: 'purina', priority: 20 },

        { brandName: 'シーバ', keyword: 'シーバ', priority: 10 },
        { brandName: 'カルカン', keyword: 'カルカン', priority: 10 },
        { brandName: 'いなば', keyword: 'いなば', priority: 10 },

        { brandName: 'デオトイレ', keyword: 'デオトイレ', priority: 5 },
        { brandName: 'デオシート', keyword: 'デオシート', priority: 5 },
        { brandName: 'ニャンとも清潔トイレ', keyword: 'ニャンとも清潔トイレ', priority: 5 },
    ] as const;

    for (const rule of brandRules) {
        const brand = await prisma.brand.findUnique({
            where: {
                name: rule.brandName,
            },
            select: {
                id: true,
            },
        });

        if (!brand) {
            console.warn(`brand not found for brandRule: ${rule.brandName}`);
            continue;
        }

        await prisma.brandRule.upsert({
            where: {
                brandId_keyword: {
                    brandId: brand.id,
                    keyword: rule.keyword,
                },
            },
            update: {
                priority: rule.priority,
                isActive: true,
            },
            create: {
                brandId: brand.id,
                keyword: rule.keyword,
                priority: rule.priority,
                isActive: true,
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