import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
const prisma = new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL })) });
async function main() {
    // JAN未設定で説明文あり商品からサンプル抽出
    const rows = await prisma.$queryRaw<{ id: bigint; description: string }[]>`
        SELECT id, description FROM products
        WHERE jan_code IS NULL AND description IS NOT NULL AND description != ''
        AND (
            description ~ '[^0-9][0-9]{13}[^0-9]' OR
            description ~ '[^0-9][0-9]{8}[^0-9]' OR
            description ~* 'jan'
        )
        LIMIT 20
    `;
    console.log(`JAN記載が疑われる商品: ${rows.length}件（サンプル）`);
    for (const r of rows.slice(0, 5)) {
        const match = r.description.match(/(?:JAN|jan)[^\d]*(\d{8}|\d{13})|(\d{13})/);
        console.log(`  id=${r.id} 抽出候補: ${match?.[1] ?? match?.[2] ?? '不明'}`);
        console.log(`  説明文冒頭: ${r.description.slice(0, 80)}`);
    }

    // 説明文を持つ商品の総数
    const total = await prisma.product.count({ where: { janCode: null, description: { not: null } } });
    console.log(`\nJAN未設定・説明文あり商品総数: ${total}件`);
    await prisma.$disconnect();
}
main().catch(console.error);
