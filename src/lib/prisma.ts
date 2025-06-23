import { PrismaClient } from '@prisma/client';

declare global {
  // allow global `var` declarations
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    // log: ['query', 'info', 'warn', 'error'], // 開発中はログを有効化すると便利
  });

if (process.env.NODE_ENV !== 'production') global.prisma = prisma;
