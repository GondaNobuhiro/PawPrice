import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = (process.env.DATABASE_URL ?? "").replace("sslmode=require", "sslmode=verify-full");
if (!connectionString) throw new Error('DATABASE_URL is not set');

const prisma = new PrismaClient({
    adapter: new PrismaPg(new Pool({ connectionString })),
});

const dryRun = process.argv.includes('--dry-run');
const BATCH_SIZE = 100;

// Each entry: [parentCode, keywords[]]
// Matched against category name only (not product names) to avoid false positives.
// Ordered from specific to general — first match wins.
// These categories come from Rakuten pet genres, so shorter terms (コート, マット etc.) are safe to use.
const CLASSIFICATION_RULES: [string, string[]][] = [
    ['toilet',    ['猫砂', 'ねこ砂', 'ネコ砂', 'システムトイレ', 'ペットシーツ', 'トイレシート', 'トイレシーツ', 'おしっこシート', '消臭砂', 'トイレ砂', 'トイレマット', 'トイレ用品', 'トイレ本体', 'トイレトレー', 'マナーパッド', 'サニタリーパンツ', '食フン防止', 'ペットドア']],
    ['food',      ['ドッグフード', 'キャットフード', 'ペットフード', 'ドライフード', 'ウェットフード', 'モイストフード', '総合栄養食', 'サプリメント', 'サプリ', '栄養補助', 'ペット用ミルク', '猫用ミルク', '犬用ミルク', '哺乳器', 'ふりかけ', 'トッピング', 'ソーセージ', 'カニかま', 'かまぼこ', 'チップス', '骨・ボーン', 'ちゃんちゃんこ']],
    ['snack',     ['おやつ', 'トリーツ', 'ガム', 'ジャーキー', '間食', 'ちゅーる', 'チュール', 'スナック']],
    ['medical',   ['動物用医薬品', '医薬品', '医療機器', '介護用品', '体温計', '包帯', 'ガーゼ', '消毒', '点耳', '点眼', '駆虫', 'フィラリア', 'ノミ取り', 'マダニ', '蚊対策', '虫除け', '皮膚薬', '目薬', '胃腸薬', '下痢止め', '外耳炎薬', '虫下し', '入浴剤', '殺虫用品']],
    ['deodorant', ['消臭剤', '消臭スプレー', '消臭シート', '脱臭', '芳香剤', '防臭', '消臭・脱臭', '消臭用品', 'フンキャッチャー', 'コロン', 'ブラッシングスプレー']],
    ['outdoor',   ['首輪', 'ハーネス', 'リード', '胴輪', 'お散歩', 'ロングリード', 'ネームタグ', '迷子札', 'シートベルト', 'チョーカー', 'クリッカー', '無駄吠え防止', 'しつけ用品', 'ネックレス', 'サングラス', 'ゴーグル', 'アクセサリー', 'チャーム', 'ネクタイ']],
    ['carry',     ['キャリーバッグ', 'キャリーケース', 'キャリーバック', 'ペットカート', 'スリング', 'お出かけバッグ', 'コンテナ', 'カート']],
    ['cage',      ['ケージ', 'サークル', 'キャットタワー', 'キャットウォーク', '猫タワー', 'ゲート', 'フェンス', 'クレート', 'ハウス', 'トンネル']],
    ['bed',       ['ペットベッド', 'ペット用ベッド', 'クールマット', 'あったかマット', 'ペット用ブランケット', 'ペット用寝具', 'あご枕', '犬用ベッド', '猫用ベッド', '噛みぐせ防止', '舐めぐせ防止', 'マット', 'ブランケット', '毛布', 'クッション']],
    ['dish',      ['食器', '水飲み', '給水器', '給餌器', 'ウォーターボウル', 'フードボウル', 'フードスコップ', 'フードクリップ', '計量スプーン', 'ランチョンマット', '水入れ', '携帯水筒']],
    ['wear',      ['犬服', '猫服', 'ペット服', 'ペット用ウェア', 'コスチューム', 'はっぴ', '着物', '浴衣', '甚平', 'ヘアゴム', 'ヘアピン', 'ヘアアクセ', 'ワードローブ', 'ハンガー', 'コート', 'Tシャツ', 'タンクトップ', 'ベスト', 'ジャケット', 'ブルゾン', 'ジャンパー', 'セーター', 'ニット', 'シャツ', 'トレーナー', 'パーカー', 'ワンピース', 'キャミソール', 'パジャマ', 'パンツ', 'ドレス', 'フォーマル', '袴', 'ジャージ', 'つなぎ', 'カバーオール', 'エプロン']],
    ['toy',       ['おもちゃ', 'ペット用トイ', 'じゃらし', 'ぬいぐるみ', '競技用タイヤ', 'ハードル', '歩道橋', 'サイコロ', 'シーソー', 'スラローム', 'ポール', 'ロープ（ペット', 'ボール（ペット']],
    ['care',      ['シャンプー', 'リンス', 'コンディショナー', 'グルーミング', '爪切り', 'ブラシ', 'スリッカー', 'コーム', '耳ケア', '目ヤニ', '歯みがき', '歯ブラシ', 'デンタルケア', 'トリミング', 'バリカン', 'スキンケア', '保湿', '爪ケア', 'ケア用品', 'お手入れ用品', 'はさみ', '抜け毛取り', '肉球ケア', '綿棒', '爪やすり', 'お掃除ローラー', '耳そうじ', '犬用ネイル', '衛生・掃除']],
];

function classifyByKeyword(categoryName: string): string | null {
    for (const [code, keywords] of CLASSIFICATION_RULES) {
        for (const kw of keywords) {
            if (categoryName.includes(kw)) {
                return code;
            }
        }
    }
    return null;
}

async function main() {
    const parentCategories = await prisma.category.findMany({
        where: { parentCategoryId: null },
        select: { id: true, code: true, name: true },
    });

    const otherCategory = parentCategories.find((c) => c.code === 'other');
    if (!otherCategory) throw new Error('Parent category with code="other" not found');

    const validParentCodes = parentCategories.map((c) => c.code);
    const parentById = new Map(parentCategories.map((c) => [c.code, c.id]));

    const unclassified = await prisma.category.findMany({
        where: {
            OR: [
                { parentCategoryId: null, code: { notIn: validParentCodes } },
                { parentCategoryId: otherCategory.id },
            ],
        },
        select: {
            id: true,
            name: true,
            code: true,
            parentCategoryId: true,
        },
        orderBy: { id: 'asc' },
    });

    console.log(`dryRun=${dryRun}`);
    console.log(`unclassifiedCategories=${unclassified.length}`);

    let updated = 0;
    let keptAsOther = 0;

    for (let i = 0; i < unclassified.length; i += BATCH_SIZE) {
        const batch = unclassified.slice(i, i + BATCH_SIZE);

        for (const cat of batch) {
            const assignedCode = classifyByKeyword(cat.name);

            if (!assignedCode) {
                keptAsOther += 1;
                console.log(`[OTHER] "${cat.name}"`);
                if (!dryRun && cat.parentCategoryId === null) {
                    await prisma.category.update({
                        where: { id: cat.id },
                        data: { parentCategoryId: otherCategory.id },
                    });
                }
                continue;
            }

            const parentId = parentById.get(assignedCode);
            if (!parentId) {
                keptAsOther += 1;
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