import '@testing-library/jest-dom';
import { mockDeep, mockReset } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { prisma as prismaClient } from '@/lib/prisma'; // 実際のPrisma Clientインスタンス
import fetchMock from 'jest-fetch-mock';
import { TypedPrismaMock } from '@/types/test-types';

// Prisma Client のモックを作成
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockDeep<PrismaClient>(),
}));

export const prismaMock = prismaClient as unknown as TypedPrismaMock;

// Global fetch mock
fetchMock.enableMocks();

// Global alert mock
global.alert = jest.fn();

// Global File mock
global.File = class File {
  constructor(
    private parts: BlobPart[],
    public name: string,
    private options?: FilePropertyBag
  ) {
    this.size = parts.reduce((acc, part) => {
      if (typeof part === 'string') return acc + part.length;
      if (part instanceof ArrayBuffer) return acc + part.byteLength;
      if (part instanceof Blob) return acc + part.size;
      return acc;
    }, 0);
    this.type = options?.type || '';
    this.lastModified = options?.lastModified || Date.now();
  }

  size: number;
  type: string;
  lastModified: number;

  async text(): Promise<string> {
    return this.parts.join('');
  }

  slice(start?: number, end?: number, contentType?: string): Blob {
    return new Blob(this.parts, { type: contentType || this.type });
  }

  stream(): ReadableStream {
    return new ReadableStream();
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    return new ArrayBuffer(0);
  }
} as any;

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

// Global fs/promises mock for API route tests
export const mockFsPromises = {
  access: jest.fn(),
  readdir: jest.fn(),
  unlink: jest.fn(),
  rename: jest.fn(),
  writeFile: jest.fn(),
  mkdir: jest.fn(),
};

jest.mock('fs/promises', () => mockFsPromises);

beforeEach(() => {
  mockReset(prismaMock);
  fetchMock.resetMocks();
  (global.alert as jest.Mock).mockClear();
  mockAppend.mockClear();
  mockGet.mockClear();
  mockGetAll.mockClear();
  mockHas.mockClear();
  mockFormDataStore.clear(); // ストアもクリアする
  
  // fs/promises mocks もクリア
  mockFsPromises.access.mockClear();
  mockFsPromises.readdir.mockClear();
  mockFsPromises.unlink.mockClear();
  mockFsPromises.rename.mockClear();
  mockFsPromises.writeFile.mockClear();
  mockFsPromises.mkdir.mockClear();
});

// Mock NextResponse.json
jest.mock('next/server', () => {
  const originalModule = jest.requireActual('next/server');
  
  // Next.js 15.3.3 互換のモック
  class MockNextResponse extends Response {
    static json(body: any, init?: ResponseInit) {
      const response = new Response(JSON.stringify(body), {
        ...init,
        headers: {
          'content-type': 'application/json',
          ...(init?.headers || {}),
        },
      });
      
      // Response-like オブジェクトを返す
      return Object.create(response, {
        json: {
          value: async () => body,
        },
        status: {
          value: init?.status || 200,
        },
        ok: {
          value: (init?.status || 200) >= 200 && (init?.status || 200) < 300,
        },
      });
    }
  }
  
  return {
    ...originalModule,
    NextResponse: MockNextResponse,
  };
}); 
