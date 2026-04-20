import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

if (!connectionString) throw new Error('DATABASE_URL is not set');
if (!anthropicApiKey) throw new Error('ANTHROPIC_API_KEY is not set');

const prisma = new PrismaClient({
    adapter: new PrismaPg(new Pool({ connectionString })),
});

const anthropic = new Anthropic({ apiKey: anthropicApiKey });

const dryRun = process.argv.includes('--dry-run');
const BATCH_SIZE = 20;

const PARENT_CATEGORY_DEFINITIONS: Record<string, string> = {
    food:      'ドッグフード・キャットフード・サプリメント・栄養補助食品・ミルク',
    snack:     'ペット用おやつ・間食・トリーツ・ガム',
    toilet:    'ペットシーツ・猫砂・トイレ本体・システムトイレ・消臭砂',
    dish:      '食器・水飲み・給水器・給餌器・フードスコップ・フードクリップ・計量器',
    cage:      'ケージ・サークル・ハウス・キャットタワー・ベッド付きハウス',
    carry:     'キャリーバッグ・ペットカート・お出かけ用バッグ・スリング',
    toy:       'おもちゃ・ロープ・ボール・しつけ用品・トレーニング用品',
    deodorant: '消臭剤・脱臭・芳香剤・消臭スプレー',
    care:      'グルーミング・シャンプー・爪切り・耳ケア・目ヤニ・ブラシ・ノミダニ駆除・スキンケア',
    wear:      '犬服・猫服・コスチューム・洋服・ウェア・帽子・靴',
    bed:       'ペット用ベッド・クッション・マット・寝具・ブランケット',
    outdoor:   '首輪・ハーネス・リード・胴輪・お散歩グッズ',
    medical:   '動物用医薬品・動物用医療機器・介護用品・応急手当・体温計・包帯',
    other:     'ペット用品に該当しない、または上記のどれにも当てはまらないもの',
};

type CategoryWithProducts = {
    id: bigint;
    name: string;
    code: string;
    products: { name: string }[];
};

async function classifyBatch(
    batch: CategoryWithProducts[],
    validParentCodes: string[],
): Promise<Record<string, string>> {
    const parentList = validParentCodes
        .map((code) => `- ${code}: ${PARENT_CATEGORY_DEFINITIONS[code] ?? code}`)
        .join('\n');

    const categoryList = batch
        .map((cat, i) => {
            const productSamples =
                cat.products.length > 0
                    ? `商品例: ${cat.products.map((p) => p.name.slice(0, 40)).join(' / ')}`
                    : '商品例: なし';
            return `${i + 1}. カテゴリ名: "${cat.name}" (${productSamples})`;
        })
        .join('\n');

    const message = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system:
            'あなたは犬・猫向けペット用品の価格比較サービスのカテゴリ分類アシスタントです。与えられたカテゴリ名と商品例をもとに、最も適切な大分類コードを選んでください。',
        messages: [
            {
                role: 'user',
                content: `以下のカテゴリを大分類に分類してください。

利用可能な大分類:
${parentList}

分類対象:
${categoryList}

番号をキー、大分類コードを値とするJSONのみ回答してください。例: {"1": "food", "2": "care"}`,
            },
        ],
    });

    const text =
        message.content[0].type === 'text' ? message.content[0].text : '';

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        console.error('Failed to parse LLM response:', text);
        return {};
    }

    return JSON.parse(jsonMatch[0]) as Record<string, string>;
}

async function main() {
    const parentCategories = await prisma.category.findMany({
        where: { parentCategoryId: null },
        select: { id: true, code: true, name: true },
    });

    const otherCategory = parentCategories.find((c) => c.code === 'other');
    if (!otherCategory) throw new Error('Parent category with code="other" not found');

    const parentById = new Map(parentCategories.map((c) => [c.code, c.id]));
    const validParentCodes = Object.keys(PARENT_CATEGORY_DEFINITIONS);


    const unclassified = await prisma.category.findMany({
        where: { parentCategoryId: otherCategory.id },
        select: {
            id: true,
            name: true,
            code: true,
            products: { select: { name: true }, take: 5 },
        },
        orderBy: { id: 'asc' },
    });

    console.log(`dryRun=${dryRun}`);
    console.log(`unclassifiedCategories=${unclassified.length}`);

    let updated = 0;
    let keptAsOther = 0;

    for (let i = 0; i < unclassified.length; i += BATCH_SIZE) {
        const batch = unclassified.slice(i, i + BATCH_SIZE);
        console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} categories)...`);

        const result = await classifyBatch(batch, validParentCodes);

        for (let j = 0; j < batch.length; j++) {
            const cat = batch[j];
            const assignedCode = result[String(j + 1)];
            const parentId = assignedCode ? parentById.get(assignedCode) : undefined;

            if (!parentId || assignedCode === 'other') {
                keptAsOther += 1;
                console.log(`[OTHER] "${cat.name}" → other`);
                continue;
            }

            updated += 1;
            console.log(`[CLASSIFY] "${cat.name}" → ${assignedCode}`);

            if (!dryRun) {
                await prisma.category.update({
                    where: { id: cat.id },
                    data: { parentCategoryId: parentId },
                });
            }
        }
    }

    console.log('classify categories done');
    console.log({ dryRun, total: unclassified.length, updated, keptAsOther });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
