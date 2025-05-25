import fs from 'fs/promises';
// import path from 'path'; // 未使用のため削除

/**
 * 指定されたファイルパスのファイルを削除します。
 * プロジェクトルートからの相対パスではなく、絶対パス、または public ディレクトリからの相対パスで解決されることを想定しています。
 * @param filePathToDelete publicディレクトリからの相対パス、または絶対パス
 */
export async function deleteFile(filePathToDelete: string): Promise<void> {
  // public ディレクトリを基準とした絶対パスに解決するロジックは呼び出し元APIルートに移動済み
  // ここでは渡されたパスをそのまま使う
  await fs.unlink(filePathToDelete);
} 
