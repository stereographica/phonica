import { generateBaseSlug, generateFriendlyName, generateUniqueSlug } from '../slug-generator';
import { prisma } from '../prisma';

// Prismaのモックを設定
jest.mock('../prisma', () => ({
  prisma: {
    material: {
      findFirst: jest.fn(),
    },
    tag: {
      findFirst: jest.fn(),
    },
    project: {
      findFirst: jest.fn(),
    },
  },
}));

describe('slug-generator', () => {
  beforeEach(() => {
    // 各テストの前にモックをリセット
    jest.clearAllMocks();
  });

  describe('generateBaseSlug', () => {
    describe('日本語の変換', () => {
      it('ひらがなをローマ字に変換する', () => {
        expect(generateBaseSlug('ふぃーるどれこーでぃんぐ')).toBe('huirudorekodeingu');
        expect(generateBaseSlug('さくら')).toBe('sakura');
      });

      it('カタカナをローマ字に変換する', () => {
        expect(generateBaseSlug('フィールドレコーディング')).toBe('huirudorekodeingu');
        expect(generateBaseSlug('サクラ')).toBe('sakura');
      });

      it('漢字をピンインに変換する', () => {
        expect(generateBaseSlug('録音')).toBe('lu-yin');
        expect(generateBaseSlug('音楽')).toBe('yin-le');
      });

      it('日本語と英語の混合を処理する', () => {
        expect(generateBaseSlug('Morning in 東京')).toBe('morning-in-dong-jing');
        expect(generateBaseSlug('録音test')).toBe('lu-yin-test');
      });
    });

    describe('記号の処理', () => {
      it('スペースをハイフンに変換する', () => {
        expect(generateBaseSlug('test file')).toBe('test-file');
        expect(generateBaseSlug('test   file')).toBe('test-file');
      });

      it('記号を削除する', () => {
        expect(generateBaseSlug('Test Title! #1')).toBe('test-title-1');
        expect(generateBaseSlug('test@example.com')).toBe('testexamplecom');
      });

      it('連続するハイフンを単一のハイフンにする', () => {
        expect(generateBaseSlug('test---file')).toBe('test-file');
        expect(generateBaseSlug('test - - file')).toBe('test-file');
      });

      it('先頭と末尾のハイフンを削除する', () => {
        expect(generateBaseSlug('-test-')).toBe('test');
        expect(generateBaseSlug('---test---')).toBe('test');
      });
    });

    describe('大文字小文字の処理', () => {
      it('英大文字を小文字に変換する', () => {
        expect(generateBaseSlug('New Recording')).toBe('new-recording');
        expect(generateBaseSlug('TEST')).toBe('test');
      });
    });

    describe('空文字とハイフンのみの処理', () => {
      it('空文字の場合はfriendly nameを生成する', () => {
        const result = generateBaseSlug('');
        expect(result).toMatch(/^[a-z]+-[a-z]+-[a-z0-9]{4}$/);
      });

      it('記号のみの場合はfriendly nameを生成する', () => {
        const result = generateBaseSlug('☆★♪');
        expect(result).toMatch(/^[a-z]+-[a-z]+-[a-z0-9]{4}$/);
      });

      it('ハイフンのみの場合はfriendly nameを生成する', () => {
        const result = generateBaseSlug('---');
        expect(result).toMatch(/^[a-z]+-[a-z]+-[a-z0-9]{4}$/);
      });

      it('スペースと記号のみの場合はfriendly nameを生成する', () => {
        const result = generateBaseSlug('   -   ');
        expect(result).toMatch(/^[a-z]+-[a-z]+-[a-z0-9]{4}$/);
      });

      it('日本語記号のみの場合はfriendly nameを生成する', () => {
        const result = generateBaseSlug('・・・ー〜');
        expect(result).toMatch(/^[a-z]+-[a-z]+-[a-z0-9]{4}$/);
      });

      it('英数字が含まれていればそれを使用する', () => {
        const result = generateBaseSlug('---test---');
        expect(result).toBe('test');
      });
    });

    describe('実際のユースケース', () => {
      it('素材のタイトルから適切なslugを生成する', () => {
        expect(generateBaseSlug('森の音')).toBe('sen-noyin');
        expect(generateBaseSlug('Ocean Waves')).toBe('ocean-waves');
        expect(generateBaseSlug('雨の日の録音')).toBe('yu-nori-nolu-yin');
      });
    });
  });

  describe('generateFriendlyName', () => {
    it('形容詞-名詞-IDの形式で生成される', () => {
      const result = generateFriendlyName();
      expect(result).toMatch(/^[a-z]+-[a-z]+-[a-z0-9]{4}$/);
    });

    it('生成されるIDは4文字', () => {
      const result = generateFriendlyName();
      const parts = result.split('-');
      expect(parts[2]).toHaveLength(4);
    });

    it('生成される値は毎回異なる', () => {
      const results = new Set();
      for (let i = 0; i < 10; i++) {
        results.add(generateFriendlyName());
      }
      expect(results.size).toBeGreaterThan(1);
    });
  });

  describe('generateUniqueSlug', () => {
    describe('material model', () => {
      it('重複がない場合はそのまま返す', async () => {
        (prisma.material.findFirst as jest.Mock).mockResolvedValue(null);

        const result = await generateUniqueSlug('Test Material', 'material');

        expect(result).toBe('test-material');
        expect(prisma.material.findFirst).toHaveBeenCalledWith({
          where: { slug: 'test-material' },
        });
      });

      it('重複がある場合は連番を付加する', async () => {
        (prisma.material.findFirst as jest.Mock)
          .mockResolvedValueOnce({ id: '1' }) // test-material exists
          .mockResolvedValueOnce({ id: '2' }) // test-material-1 exists
          .mockResolvedValueOnce(null); // test-material-2 doesn't exist

        const result = await generateUniqueSlug('Test Material', 'material');

        expect(result).toBe('test-material-2');
        expect(prisma.material.findFirst).toHaveBeenCalledTimes(3);
      });

      it('excludeIdが指定された場合は自身を除外する', async () => {
        (prisma.material.findFirst as jest.Mock).mockResolvedValue(null);

        const result = await generateUniqueSlug('Test Material', 'material', 'exclude-id');

        expect(result).toBe('test-material');
        expect(prisma.material.findFirst).toHaveBeenCalledWith({
          where: { slug: 'test-material', NOT: { id: 'exclude-id' } },
        });
      });
    });

    describe('tag model', () => {
      it('タグのslugを生成する', async () => {
        (prisma.tag.findFirst as jest.Mock).mockResolvedValue(null);

        const result = await generateUniqueSlug('環境音', 'tag');

        expect(result).toBe('huan-jing-yin');
        expect(prisma.tag.findFirst).toHaveBeenCalledWith({
          where: { slug: 'huan-jing-yin' },
        });
      });
    });

    describe('project model', () => {
      it('プロジェクトのslugを生成する', async () => {
        (prisma.project.findFirst as jest.Mock).mockResolvedValue(null);

        const result = await generateUniqueSlug('My Project', 'project');

        expect(result).toBe('my-project');
        expect(prisma.project.findFirst).toHaveBeenCalledWith({
          where: { slug: 'my-project' },
        });
      });
    });

    describe('日本語入力のテスト', () => {
      it('日本語タイトルで重複チェックと連番付加が機能する', async () => {
        (prisma.material.findFirst as jest.Mock)
          .mockResolvedValueOnce({ id: '1' }) // lu-yin-tesuto exists
          .mockResolvedValueOnce(null); // lu-yin-tesuto-1 doesn't exist

        const result = await generateUniqueSlug('録音テスト', 'material');

        expect(result).toBe('lu-yin-tesuto-1');
      });
    });
  });
});
