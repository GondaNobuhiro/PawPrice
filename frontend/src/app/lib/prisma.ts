import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as {
    prisma?: PrismaClient;
    pool?: Pool;
};

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
}

const pool =
    globalForPrisma.pool ??
    new Pool({
        connectionString,
        max: 3,
        idleTimeoutMillis: 10_000,
        connectionTimeoutMillis: 5_000,
    });

const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        adapter: new PrismaPg(pool),
    });

globalForPrisma.pool = pool;
globalForPrisma.prisma = prisma;

export { prisma };