import { transliterate } from 'transliteration';
import { customAlphabet } from 'nanoid';
import { prisma } from '@/lib/prisma';

/**
 * 基本のslugを生成する
 * - 日本語（ひらがな、カタカナ、漢字）を音写変換
 * - 正規化（小文字、記号削除、ハイフン変換）
 * - 空文字やハイフンのみの場合はfriendly name生成
 */
export function generateBaseSlug(text: string): string {
  // 音写変換（日本語→ローマ字、中国語→ピンイン）
  // unknownオプションで変換できない文字を?に置換
  let slug = transliterate(text, { unknown: '?' });

  // 正規化
  slug = slug
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // スペース→ハイフン
    .replace(/[^\w-]+/g, '') // 英数字とハイフン以外削除
    .replace(/--+/g, '-') // 連続ハイフン→単一ハイフン
    .replace(/^-+|-+$/g, ''); // 先頭末尾のハイフン削除

  // 最終的な有効性チェック
  // 空文字、ハイフンのみ、または英数字が1文字も含まれない場合
  if (!slug || !slug.match(/[a-z0-9]/)) {
    slug = generateFriendlyName();
  }

  return slug;
}

/**
 * 人間にとって読みやすいランダムな名前を生成
 * 形式: {形容詞}-{名詞}-{4文字のID}
 */
export function generateFriendlyName(): string {
  const adjectives = ['gentle', 'bright', 'calm', 'dynamic', 'elegant'];
  const nouns = ['melody', 'harmony', 'rhythm', 'sound', 'wave'];

  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  // カスタムアルファベットを使用して4文字のIDを生成
  const customNanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 4);
  const id = customNanoid();

  return `${adj}-${noun}-${id}`;
}

/**
 * ユニークなslugを生成する
 * データベースで重複チェックを行い、重複があれば連番を付加
 */
export async function generateUniqueSlug(
  text: string,
  model: 'material' | 'tag' | 'project',
  excludeId?: string,
): Promise<string> {
  // 基本slug生成
  const baseSlug = generateBaseSlug(text);

  // 重複チェックと連番付加
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const exists = await checkSlugExists(slug, model, excludeId);
    if (!exists) break;

    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

/**
 * slugの存在チェック
 */
async function checkSlugExists(
  slug: string,
  model: 'material' | 'tag' | 'project',
  excludeId?: string,
): Promise<boolean> {
  const where = excludeId ? { slug, NOT: { id: excludeId } } : { slug };

  switch (model) {
    case 'material':
      const material = await prisma.material.findFirst({ where });
      return !!material;
    case 'tag':
      const tag = await prisma.tag.findFirst({ where });
      return !!tag;
    case 'project':
      const project = await prisma.project.findFirst({ where });
      return !!project;
  }
}
