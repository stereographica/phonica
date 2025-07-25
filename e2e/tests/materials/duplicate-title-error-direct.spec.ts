import { test, expect } from '../../fixtures/test-fixtures';

test.describe('@materials Direct API Duplicate Title Test', () => {
  test('API should return 409 for duplicate title on update', async ({ request }) => {
    // 動的に素材一覧を取得
    const materialsResponse = await request.get('/api/materials');
    expect(materialsResponse.status()).toBe(200);
    const responseData = await materialsResponse.json();

    // APIレスポンスが配列か、dataプロパティを持つオブジェクトかを確認
    const materials = Array.isArray(responseData)
      ? responseData
      : responseData.data || responseData.materials || [];

    // 最低2つの素材が必要
    expect(materials.length).toBeGreaterThanOrEqual(2);

    const sourceMaterial = materials[0]; // 更新対象の素材
    const targetMaterial = materials[1]; // タイトルを取得する素材
    const duplicateTitle = targetMaterial.title;

    console.log(`Testing update of material with slug: ${sourceMaterial.slug}`);
    console.log(
      `Attempting to set duplicate title: ${duplicateTitle} (from ${targetMaterial.slug})`,
    );

    // sourceMaterialを、targetMaterialと同じタイトルに変更
    const response = await request.put(`/api/materials/${sourceMaterial.slug}`, {
      data: {
        title: duplicateTitle, // 既存の素材と同じタイトルに変更
        recordedAt: new Date().toISOString(),
        tags: [],
        equipmentIds: [],
      },
    });

    console.log(`API Response status: ${response.status()}`);
    const apiResponseData = await response.json();
    console.log(`API Response body: ${JSON.stringify(apiResponseData)}`);

    // 409エラーが返ることを確認
    expect(response.status()).toBe(409);
    expect(apiResponseData.error).toBe('そのタイトルの素材は既に存在しています');
  });

  test('API should allow update without title change', async ({ request }) => {
    // 動的に素材一覧を取得
    const materialsResponse = await request.get('/api/materials');
    expect(materialsResponse.status()).toBe(200);
    const responseData = await materialsResponse.json();

    // APIレスポンスが配列か、dataプロパティを持つオブジェクトかを確認
    const materials = Array.isArray(responseData)
      ? responseData
      : responseData.data || responseData.materials || [];

    // 最低1つの素材が必要
    expect(materials.length).toBeGreaterThanOrEqual(1);

    const currentMaterial = materials[0];
    const originalTitle = currentMaterial.title;

    console.log(`Testing update of material with slug: ${currentMaterial.slug}`);
    console.log(`Keeping original title: ${originalTitle}`);

    // 直接APIを叩く
    const response = await request.put(`/api/materials/${currentMaterial.slug}`, {
      data: {
        title: originalTitle, // 同じタイトル
        recordedAt: new Date().toISOString(),
        memo: 'Updated memo without title change',
        tags: [],
        equipmentIds: [],
      },
    });

    console.log(`API Response status: ${response.status()}`);
    const updateResponseData = await response.json();
    console.log(`API Response body: ${JSON.stringify(updateResponseData)}`);

    // 200成功が返ることを確認
    expect(response.status()).toBe(200);
    expect(updateResponseData.title).toBe(originalTitle);
  });
});
