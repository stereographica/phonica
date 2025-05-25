import '@testing-library/jest-dom';
import { mockDeep, mockReset } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { prisma as prismaClient } from '@/lib/prisma'; // 実際のPrisma Clientインスタンス
import fetchMock from 'jest-fetch-mock';

// Prisma Client のモックを作成
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockDeep<PrismaClient>(),
}));

export const prismaMock = prismaClient as unknown as ReturnType<typeof mockDeep<PrismaClient>>;

// Global fetch mock
fetchMock.enableMocks();

// Global alert mock
global.alert = jest.fn();

// Global FormData mock
// このモックは、NextRequestのformData()メソッドが返すPromise<FormData>を解決するために使われる
// createMockRequest内で、このモックを使って実際のFormDataインスタンスが作られる
const mockFormDataStore = new Map<string, string | File>();
export const mockAppend = jest.fn((key: string, value: string | File) => {
  mockFormDataStore.set(key, value);
});
export const mockGet = jest.fn((key: string): string | File | null => {
  return mockFormDataStore.get(key) || null;
});
export const mockGetAll = jest.fn((key: string): (string | File)[] => {
  // 実際のFormDataは同じキーで複数の値を持てるが、ここでは単純化のため最後にセットされたもののみを返す
  const value = mockFormDataStore.get(key);
  return value ? [value] : [];
});
export const mockHas = jest.fn((key: string): boolean => {
  return mockFormDataStore.has(key);
});

global.FormData = jest.fn(() => ({
  append: mockAppend,
  get: mockGet, 
  getAll: mockGetAll,
  has: mockHas,
  // 他のFormDataメソッドも必要に応じてモックに追加
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
})) as any;

beforeEach(() => {
  mockReset(prismaMock);
  fetchMock.resetMocks();
  (global.alert as jest.Mock).mockClear();
  mockAppend.mockClear();
  mockGet.mockClear();
  mockGetAll.mockClear();
  mockHas.mockClear();
  mockFormDataStore.clear(); // ストアもクリアする
});

// Mock NextResponse.json
jest.mock('next/server', () => {
  const originalModule = jest.requireActual('next/server');
  return {
    ...originalModule,
    NextResponse: {
      ...originalModule.NextResponse,
      json: jest.fn((body, init) => {
        // 実際のレスポンスオブジェクトに近い形でモックする
        // テストで status や headers を確認できるようにする
        return {
          json: async () => body, // .json() メソッドは Promise を返す body を持つオブジェクトを返す
          status: init?.status || 200,
          headers: new Headers(init?.headers),
          ok: (init?.status || 200) >= 200 && (init?.status || 200) < 300,
          redirect: jest.fn(),
          text: async () => JSON.stringify(body),
          clone: jest.fn(),
          // 必要に応じて他のプロパティやメソッドも追加
        } as unknown as Response; // Response 型にキャストして互換性を持たせる
      }),
    },
  };
}); 
