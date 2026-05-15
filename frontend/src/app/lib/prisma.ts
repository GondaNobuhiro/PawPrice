import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as {
    prisma?: PrismaClient;
    pool?: Pool;
};

const rawUrl = process.env.DATABASE_URL;

if (!rawUrl) {
    throw new Error('DATABASE_URL is not set');
}

// sslmode=require は次世代pgで挙動が変わるため verify-full に明示化して警告を抑制
const connectionString = rawUrl.replace('sslmode=require', 'sslmode=verify-full');

const pool =
    globalForPrisma.pool ??
    new Pool({
        connectionString,
        max: 1,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 15_000,
        // PgBouncer（Neon pooler）はPrepared Statementを無効化する必要がある
        statement_timeout: 30_000,
    });

const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        adapter: new PrismaPg(pool),
    });

globalForPrisma.pool = pool;
globalForPrisma.prisma = prisma;

export { prisma };