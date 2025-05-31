import { Prisma } from '@prisma/client';
import { DeepMockProxy } from 'jest-mock-extended';

// Prisma mock type definitions
export type MockFindManyArgs = {
  where?: {
    title?: { contains: string; mode?: string };
    tags?: { some?: { name: string } };
  };
  orderBy?: Record<string, 'asc' | 'desc'>;
  skip?: number;
  take?: number;
  include?: Record<string, boolean>;
};

export type MockCountArgs = {
  where?: {
    title?: { contains: string; mode?: string };
    tags?: { some?: { name: string } };
  };
};

// Material type for tests
export type TestMaterial = {
  id: string;
  slug: string;
  title: string;
  tags: Array<{ id: string; name: string; slug: string }>;
  equipments: Array<{ id: string; name: string; type: string; manufacturer: string }>;
  [key: string]: unknown;
};

// Equipment type for tests
export type TestEquipment = {
  id: string;
  name: string;
  type: string;
  manufacturer: string;
  memo?: string | null;
};

// Transaction function type
export type TransactionFunction<T> = (tx: unknown) => Promise<T>;

// Extend PrismaClient mock with proper typing
export interface TypedPrismaMock extends DeepMockProxy<import('@prisma/client').PrismaClient> {
  material: {
    findMany: jest.MockedFunction<(args?: MockFindManyArgs) => Promise<TestMaterial[]>>;
    count: jest.MockedFunction<(args?: MockCountArgs) => Promise<number>>;
    create: jest.MockedFunction<(args: Prisma.MaterialCreateArgs) => Promise<TestMaterial>>;
    findUnique: jest.MockedFunction<(args: Prisma.MaterialFindUniqueArgs) => Promise<TestMaterial | null>>;
    update: jest.MockedFunction<(args: Prisma.MaterialUpdateArgs) => Promise<TestMaterial>>;
    delete: jest.MockedFunction<(args: Prisma.MaterialDeleteArgs) => Promise<TestMaterial>>;
  };
  equipment: {
    findMany: jest.MockedFunction<(args?: Prisma.EquipmentFindManyArgs) => Promise<TestEquipment[]>>;
  };
  $transaction: jest.MockedFunction<<T>(fn: TransactionFunction<T>) => Promise<T>>;
}