import { Material } from '../material';

describe('Material型定義', () => {
  it('ratingフィールドが定義されている', () => {
    // Arrange: テスト用のMaterialオブジェクトを作成
    const material: Material = {
      id: 'test-id',
      slug: 'test-slug',
      title: 'Test Material',
      recordedAt: '2024-01-01T00:00:00Z',
      tags: [],
      filePath: '/test/path',
      rating: 4, // ratingフィールドが必要
    };

    // Assert: ratingフィールドが期待される型を持つ
    expect(typeof material.rating).toBe('number');
    expect(material.rating).toBeGreaterThanOrEqual(0);
    expect(material.rating).toBeLessThanOrEqual(5);
  });

  it('ratingフィールドがnullを許可する', () => {
    // Arrange: rating未設定のMaterialオブジェクト
    const material: Material = {
      id: 'test-id',
      slug: 'test-slug',
      title: 'Test Material',
      recordedAt: '2024-01-01T00:00:00Z',
      tags: [],
      filePath: '/test/path',
      rating: null, // nullが許可される
    };

    // Assert: nullが許可される
    expect(material.rating).toBeNull();
  });

  it('ratingフィールドがundefinedを許可する', () => {
    // Arrange: rating未指定のMaterialオブジェクト
    const material: Material = {
      id: 'test-id',
      slug: 'test-slug',
      title: 'Test Material',
      recordedAt: '2024-01-01T00:00:00Z',
      tags: [],
      filePath: '/test/path',
      // rating フィールドを省略
    };

    // Assert: undefinedが許可される
    expect(material.rating).toBeUndefined();
  });
});
