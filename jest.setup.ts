import { mockDeep, mockReset } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { prisma as prismaClient } from '@/lib/prisma'; // 実際のPrisma Clientインスタンス

// Prisma Client のモックを作成
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockDeep<PrismaClient>(),
}));

export const prismaMock = prismaClient as unknown as ReturnType<typeof mockDeep<PrismaClient>>;

beforeEach(() => {
  mockReset(prismaMock); // 各テストの前にモックをリセット
}); 
