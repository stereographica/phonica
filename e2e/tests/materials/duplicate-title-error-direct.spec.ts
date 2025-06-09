import { test, expect } from '../../fixtures/test-fixtures';

test.describe('@materials Direct API Duplicate Title Test', () => {
  test('API should return 409 for duplicate title on update', async ({ request }) => {
    // シードデータから既知の素材を使用
    // "New York Subway" のslugは通常 "nyc-subway" または類似の形式
    const targetSlug = 'nyc-subway';
    const duplicateTitle = '温泉の音 ♨️'; // 既存の素材タイトル

    console.log(`Testing update of material with slug: ${targetSlug}`);
    console.log(`Attempting to set duplicate title: ${duplicateTitle}`);

    // 直接APIを叩く
    const response = await request.put(`/api/materials/${targetSlug}`, {
      data: {
        title: duplicateTitle, // 既存の素材と同じタイトルに変更
        recordedAt: new Date().toISOString(),
        tags: [],
        equipmentIds: [],
      },
    });

    console.log(`API Response status: ${response.status()}`);
    const responseData = await response.json();
    console.log(`API Response body: ${JSON.stringify(responseData)}`);

    // 409エラーが返ることを確認
    expect(response.status()).toBe(409);
    expect(responseData.error).toBe('そのタイトルの素材は既に存在しています');
  });

  test('API should allow update without title change', async ({ request }) => {
    // タイトルを変更しない場合は成功するはず
    const targetSlug = 'nyc-subway';
    const originalTitle = 'New York Subway';

    console.log(`Testing update of material with slug: ${targetSlug}`);
    console.log(`Keeping original title: ${originalTitle}`);

    // 直接APIを叩く
    const response = await request.put(`/api/materials/${targetSlug}`, {
      data: {
        title: originalTitle, // 同じタイトル
        recordedAt: new Date().toISOString(),
        memo: 'Updated memo without title change',
        tags: [],
        equipmentIds: [],
      },
    });

    console.log(`API Response status: ${response.status()}`);
    const responseData = await response.json();
    console.log(`API Response body: ${JSON.stringify(responseData)}`);

    // 200成功が返ることを確認
    expect(response.status()).toBe(200);
    expect(responseData.title).toBe(originalTitle);
  });
});
