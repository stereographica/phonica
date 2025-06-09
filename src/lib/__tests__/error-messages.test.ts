import {
  getErrorMessage,
  getSuccessMessage,
  FILE_ERROR_MESSAGES,
  ERROR_MESSAGES,
} from '../error-messages';

describe('error-messages', () => {
  describe('ERROR_MESSAGES定数', () => {
    it('重複チェックエラーメッセージが定義されている', () => {
      expect(ERROR_MESSAGES).toBeDefined();
      expect(ERROR_MESSAGES.MATERIAL_TITLE_EXISTS).toBe('そのタイトルの素材は既に存在しています');
      expect(ERROR_MESSAGES.EQUIPMENT_NAME_EXISTS).toBe('その名前の機材は既に存在しています');
      expect(ERROR_MESSAGES.TAG_NAME_EXISTS).toBe('その名前のタグは既に存在しています');
    });

    it('バリデーションエラーメッセージが定義されている', () => {
      expect(ERROR_MESSAGES.REQUIRED_FIELD_MISSING).toBe('必須項目が入力されていません');
      expect(ERROR_MESSAGES.INVALID_FORMAT).toBe('形式が正しくありません');
    });

    it('システムエラーメッセージが定義されている', () => {
      expect(ERROR_MESSAGES.DATABASE_ERROR).toBe('データベースエラーが発生しました');
      expect(ERROR_MESSAGES.UNKNOWN_ERROR).toBe('予期せぬエラーが発生しました');
    });
  });
  describe('getErrorMessage', () => {
    describe('HTTPエラー', () => {
      it('HTTPステータスコードに対応するメッセージを返す', () => {
        expect(getErrorMessage({ status: 400 })).toBe('入力内容に誤りがあります。');
        expect(getErrorMessage({ status: 401 })).toBe('ログインが必要です。');
        expect(getErrorMessage({ status: 403 })).toBe('この操作を実行する権限がありません。');
        expect(getErrorMessage({ status: 404 })).toBe('要求されたリソースが見つかりません。');
        expect(getErrorMessage({ status: 500 })).toBe('サーバーエラーが発生しました。');
      });

      it('未定義のHTTPステータスコードの場合はデフォルトメッセージを返す', () => {
        expect(getErrorMessage({ status: 418 })).toBe(
          '予期しないエラーが発生しました。もう一度お試しください。',
        );
      });
    });

    describe('Prismaエラー', () => {
      it('Prismaエラーコードに対応するメッセージを返す', () => {
        expect(getErrorMessage({ code: 'P2002' })).toBe('このデータは既に登録されています。');
        expect(getErrorMessage({ code: 'P2003' })).toBe('関連するデータが見つかりません。');
        expect(getErrorMessage({ code: 'P2025' })).toBe('削除しようとしたデータが見つかりません。');
        expect(getErrorMessage({ code: 'P2014' })).toBe('関連するデータがあるため削除できません。');
      });

      it('未定義のPrismaエラーコードの場合はデフォルトメッセージを返す', () => {
        expect(getErrorMessage({ code: 'P9999' })).toBe(
          '予期しないエラーが発生しました。もう一度お試しください。',
        );
      });
    });

    describe('ファイルエラー', () => {
      it('ファイルサイズエラーを判定できる', () => {
        expect(getErrorMessage({ message: 'File size too large' })).toBe(
          FILE_ERROR_MESSAGES.FILE_TOO_LARGE,
        );
        expect(getErrorMessage({ message: 'The file exceeds the maximum size' })).toBe(
          FILE_ERROR_MESSAGES.FILE_TOO_LARGE,
        );
      });

      it('ファイルが見つからないエラーを判定できる', () => {
        expect(getErrorMessage({ message: 'File not found' })).toBe(
          FILE_ERROR_MESSAGES.FILE_NOT_FOUND,
        );
        expect(getErrorMessage({ message: 'The file was not found' })).toBe(
          FILE_ERROR_MESSAGES.FILE_NOT_FOUND,
        );
      });

      it('ファイルタイプエラーを判定できる', () => {
        expect(getErrorMessage({ message: 'Invalid file type' })).toBe(
          FILE_ERROR_MESSAGES.INVALID_FILE_TYPE,
        );
        expect(getErrorMessage({ message: 'Unsupported file format' })).toBe(
          FILE_ERROR_MESSAGES.INVALID_FILE_TYPE,
        );
      });

      it('その他のファイルエラーはデフォルトのファイルエラーメッセージを返す', () => {
        expect(getErrorMessage({ message: 'File upload error' })).toBe(
          FILE_ERROR_MESSAGES.UPLOAD_FAILED,
        );
      });
    });

    describe('操作別エラーメッセージ', () => {
      it('操作とエンティティに応じたメッセージを返す', () => {
        expect(getErrorMessage({}, 'create', 'material')).toBe('素材の登録に失敗しました。');
        expect(getErrorMessage({}, 'update', 'project')).toBe('プロジェクトの更新に失敗しました。');
        expect(getErrorMessage({}, 'delete', 'tag')).toBe('タグの削除に失敗しました。');
        expect(getErrorMessage({}, 'fetch', 'equipment')).toBe('機材の取得に失敗しました。');
      });

      it('エンティティが指定されていない場合はデフォルトメッセージを返す', () => {
        expect(getErrorMessage({}, 'create')).toBe('データの作成に失敗しました。');
        expect(getErrorMessage({}, 'update')).toBe('データの更新に失敗しました。');
        expect(getErrorMessage({}, 'delete')).toBe('データの削除に失敗しました。');
        expect(getErrorMessage({}, 'fetch')).toBe('データの取得に失敗しました。');
      });

      it('操作が未定義の場合はデフォルトメッセージを返す', () => {
        expect(getErrorMessage({}, 'unknown', 'material')).toBe(
          '予期しないエラーが発生しました。もう一度お試しください。',
        );
      });
    });

    describe('エラータイプの優先順位', () => {
      it('HTTPエラーがPrismaエラーより優先される', () => {
        expect(getErrorMessage({ status: 404, code: 'P2002' })).toBe(
          '要求されたリソースが見つかりません。',
        );
      });

      it('Prismaエラーが操作別メッセージより優先される', () => {
        expect(getErrorMessage({ code: 'P2002' }, 'create', 'material')).toBe(
          'このデータは既に登録されています。',
        );
      });
    });

    describe('エッジケース', () => {
      it('nullの場合はデフォルトメッセージを返す', () => {
        expect(getErrorMessage(null)).toBe(
          '予期しないエラーが発生しました。もう一度お試しください。',
        );
      });

      it('undefinedの場合はデフォルトメッセージを返す', () => {
        expect(getErrorMessage(undefined)).toBe(
          '予期しないエラーが発生しました。もう一度お試しください。',
        );
      });

      it('文字列の場合はデフォルトメッセージを返す', () => {
        expect(getErrorMessage('エラー')).toBe(
          '予期しないエラーが発生しました。もう一度お試しください。',
        );
      });

      it('数値の場合はデフォルトメッセージを返す', () => {
        expect(getErrorMessage(500)).toBe(
          '予期しないエラーが発生しました。もう一度お試しください。',
        );
      });

      it('不正な型のstatusの場合はデフォルトメッセージを返す', () => {
        expect(getErrorMessage({ status: '400' })).toBe(
          '予期しないエラーが発生しました。もう一度お試しください。',
        );
      });

      it('不正な型のcodeの場合はデフォルトメッセージを返す', () => {
        expect(getErrorMessage({ code: 2002 })).toBe(
          '予期しないエラーが発生しました。もう一度お試しください。',
        );
      });
    });
  });

  describe('getSuccessMessage', () => {
    describe('操作別成功メッセージ', () => {
      it('操作とエンティティに応じたメッセージを返す', () => {
        expect(getSuccessMessage('create', 'material')).toBe('素材を登録しました。');
        expect(getSuccessMessage('update', 'project')).toBe('プロジェクトを更新しました。');
        expect(getSuccessMessage('delete', 'tag')).toBe('タグを削除しました。');
        expect(getSuccessMessage('copy', 'url')).toBe('URLをクリップボードにコピーしました。');
      });

      it('エンティティが指定されていない場合はデフォルトメッセージを返す', () => {
        expect(getSuccessMessage('create')).toBe('データを作成しました。');
        expect(getSuccessMessage('update')).toBe('データを更新しました。');
        expect(getSuccessMessage('delete')).toBe('データを削除しました。');
        expect(getSuccessMessage('copy')).toBe('クリップボードにコピーしました。');
      });

      it('未定義の操作の場合はデフォルトメッセージを返す', () => {
        expect(getSuccessMessage('unknown')).toBe('操作が完了しました。');
        expect(getSuccessMessage('unknown', 'material')).toBe('操作が完了しました。');
      });
    });

    describe('大文字小文字の処理', () => {
      it('操作名の大文字小文字を正しく処理する', () => {
        expect(getSuccessMessage('CREATE', 'material')).toBe('素材を登録しました。');
        expect(getSuccessMessage('Create', 'material')).toBe('素材を登録しました。');
        expect(getSuccessMessage('create', 'material')).toBe('素材を登録しました。');
      });

      it('エンティティ名の大文字小文字を正しく処理する', () => {
        expect(getSuccessMessage('create', 'MATERIAL')).toBe('素材を登録しました。');
        expect(getSuccessMessage('create', 'Material')).toBe('素材を登録しました。');
        expect(getSuccessMessage('create', 'material')).toBe('素材を登録しました。');
      });
    });
  });
});
