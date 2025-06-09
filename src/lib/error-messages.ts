/**
 * エラーコードとユーザーフレンドリーなメッセージのマッピング
 */

// HTTPステータスコードのメッセージ
export const HTTP_ERROR_MESSAGES: Record<number, string> = {
  400: '入力内容に誤りがあります。',
  401: 'ログインが必要です。',
  403: 'この操作を実行する権限がありません。',
  404: '要求されたリソースが見つかりません。',
  409: '既に同じデータが存在します。',
  413: 'ファイルサイズが大きすぎます。',
  422: '入力されたデータの形式が正しくありません。',
  429: 'リクエストが多すぎます。しばらく待ってから再度お試しください。',
  500: 'サーバーエラーが発生しました。',
  502: 'サーバーとの通信に問題が発生しました。',
  503: 'サービスが一時的に利用できません。',
  504: 'サーバーの応答がタイムアウトしました。',
};

// Prismaエラーコードのメッセージ
export const PRISMA_ERROR_MESSAGES: Record<string, string> = {
  P2002: 'このデータは既に登録されています。',
  P2003: '関連するデータが見つかりません。',
  P2025: '削除しようとしたデータが見つかりません。',
  P2014: '関連するデータがあるため削除できません。',
  P2021: 'テーブルが存在しません。',
  P2022: 'カラムが存在しません。',
  P2023: 'データの整合性エラーが発生しました。',
};

// ファイル操作エラーメッセージ
export const FILE_ERROR_MESSAGES = {
  UPLOAD_FAILED: 'ファイルのアップロードに失敗しました。',
  FILE_TOO_LARGE: 'ファイルサイズが制限を超えています。',
  INVALID_FILE_TYPE: 'サポートされていないファイル形式です。',
  FILE_NOT_FOUND: 'ファイルが見つかりません。',
  FILE_READ_ERROR: 'ファイルの読み取りに失敗しました。',
  FILE_WRITE_ERROR: 'ファイルの書き込みに失敗しました。',
  FILE_DELETE_ERROR: 'ファイルの削除に失敗しました。',
};

// 操作別のエラーメッセージ
export const OPERATION_ERROR_MESSAGES = {
  CREATE: {
    DEFAULT: 'データの作成に失敗しました。',
    MATERIAL: '素材の登録に失敗しました。',
    PROJECT: 'プロジェクトの作成に失敗しました。',
    TAG: 'タグの作成に失敗しました。',
    EQUIPMENT: '機材の登録に失敗しました。',
  },
  UPDATE: {
    DEFAULT: 'データの更新に失敗しました。',
    MATERIAL: '素材の更新に失敗しました。',
    PROJECT: 'プロジェクトの更新に失敗しました。',
    TAG: 'タグの更新に失敗しました。',
    EQUIPMENT: '機材の更新に失敗しました。',
  },
  DELETE: {
    DEFAULT: 'データの削除に失敗しました。',
    MATERIAL: '素材の削除に失敗しました。',
    PROJECT: 'プロジェクトの削除に失敗しました。',
    TAG: 'タグの削除に失敗しました。',
    EQUIPMENT: '機材の削除に失敗しました。',
  },
  FETCH: {
    DEFAULT: 'データの取得に失敗しました。',
    MATERIAL: '素材の取得に失敗しました。',
    PROJECT: 'プロジェクトの取得に失敗しました。',
    TAG: 'タグの取得に失敗しました。',
    EQUIPMENT: '機材の取得に失敗しました。',
  },
};

// 成功メッセージ
export const SUCCESS_MESSAGES = {
  CREATE: {
    DEFAULT: 'データを作成しました。',
    MATERIAL: '素材を登録しました。',
    PROJECT: 'プロジェクトを作成しました。',
    TAG: 'タグを作成しました。',
    EQUIPMENT: '機材を登録しました。',
  },
  UPDATE: {
    DEFAULT: 'データを更新しました。',
    MATERIAL: '素材を更新しました。',
    PROJECT: 'プロジェクトを更新しました。',
    TAG: 'タグを更新しました。',
    EQUIPMENT: '機材を更新しました。',
  },
  DELETE: {
    DEFAULT: 'データを削除しました。',
    MATERIAL: '素材を削除しました。',
    PROJECT: 'プロジェクトを削除しました。',
    TAG: 'タグを削除しました。',
    EQUIPMENT: '機材を削除しました。',
  },
  COPY: {
    DEFAULT: 'クリップボードにコピーしました。',
    URL: 'URLをクリップボードにコピーしました。',
  },
};

// エラーオブジェクトからユーザーフレンドリーなメッセージを取得
export function getErrorMessage(error: unknown, operation?: string, entity?: string): string {
  // HTTPエラーの場合
  if (error && typeof error === 'object' && 'status' in error) {
    const errorWithStatus = error as { status: unknown };
    const status = errorWithStatus.status;
    if (typeof status === 'number' && HTTP_ERROR_MESSAGES[status]) {
      return HTTP_ERROR_MESSAGES[status];
    }
  }

  // Prismaエラーの場合
  if (error && typeof error === 'object' && 'code' in error) {
    const errorWithCode = error as { code: unknown };
    const code = errorWithCode.code;
    if (typeof code === 'string' && PRISMA_ERROR_MESSAGES[code]) {
      return PRISMA_ERROR_MESSAGES[code];
    }
  }

  // ファイルエラーの場合
  if (error && typeof error === 'object' && 'message' in error) {
    const errorWithMessage = error as { message: unknown };
    const message = errorWithMessage.message;
    if (typeof message === 'string') {
      // ファイル関連のキーワードをチェック
      if (message.toLowerCase().includes('file')) {
        if (message.includes('too large') || message.includes('size')) {
          return FILE_ERROR_MESSAGES.FILE_TOO_LARGE;
        }
        if (message.includes('not found')) {
          return FILE_ERROR_MESSAGES.FILE_NOT_FOUND;
        }
        if (message.includes('type') || message.includes('format')) {
          return FILE_ERROR_MESSAGES.INVALID_FILE_TYPE;
        }
        return FILE_ERROR_MESSAGES.UPLOAD_FAILED;
      }
    }
  }

  // 操作別のデフォルトメッセージ
  if (operation) {
    const operationMessages =
      OPERATION_ERROR_MESSAGES[operation.toUpperCase() as keyof typeof OPERATION_ERROR_MESSAGES];
    if (operationMessages) {
      if (entity) {
        const entityMessage =
          operationMessages[entity.toUpperCase() as keyof typeof operationMessages];
        if (entityMessage) {
          return entityMessage;
        }
      }
      return operationMessages.DEFAULT;
    }
  }

  // デフォルトメッセージ
  return '予期しないエラーが発生しました。もう一度お試しください。';
}

// 新しい定数：重複チェックとバリデーション用のエラーメッセージ
export const ERROR_MESSAGES = {
  // 重複エラー
  MATERIAL_TITLE_EXISTS: 'そのタイトルの素材は既に存在しています',
  EQUIPMENT_NAME_EXISTS: 'その名前の機材は既に存在しています',
  TAG_NAME_EXISTS: 'その名前のタグは既に存在しています',

  // バリデーションエラー
  REQUIRED_FIELD_MISSING: '必須項目が入力されていません',
  INVALID_FORMAT: '形式が正しくありません',

  // システムエラー
  DATABASE_ERROR: 'データベースエラーが発生しました',
  UNKNOWN_ERROR: '予期せぬエラーが発生しました',
} as const;

export type ErrorMessageKey = keyof typeof ERROR_MESSAGES;

// 成功メッセージを取得
export function getSuccessMessage(operation: string, entity?: string): string {
  const operationMessages =
    SUCCESS_MESSAGES[operation.toUpperCase() as keyof typeof SUCCESS_MESSAGES];
  if (operationMessages) {
    if (entity) {
      const entityMessage =
        operationMessages[entity.toUpperCase() as keyof typeof operationMessages];
      if (entityMessage) {
        return entityMessage;
      }
    }
    return operationMessages.DEFAULT;
  }
  return '操作が完了しました。';
}
