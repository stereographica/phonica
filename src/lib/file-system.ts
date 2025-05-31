import fs from 'fs/promises';
import path from 'path';

// ファイル操作のログ型定義
export interface FileOperationLog {
  operation: 'delete' | 'rename' | 'create';
  path: string;
  materialId?: string;
  success: boolean;
  error?: string;
  timestamp: string;
}

// ファイル操作のエラー型定義
export interface FileSystemError extends Error {
  code?: string;
}

/**
 * ファイル操作をログに記録します
 */
export async function logFileOperation(log: FileOperationLog): Promise<void> {
  console.log(JSON.stringify({
    level: log.success ? 'info' : 'error',
    message: 'File operation',
    ...log
  }));
}

/**
 * ファイルパスを検証して正規化します
 * @param filePath 検証するファイルパス
 * @param baseDir 基準ディレクトリ
 * @returns 正規化された絶対パス
 * @throws パスが基準ディレクトリ外の場合エラー
 */
export function validateAndNormalizePath(filePath: string, baseDir: string): string {
  // パスを正規化
  const normalizedPath = path.normalize(filePath);
  
  // 絶対パスに変換
  const absolutePath = path.isAbsolute(normalizedPath) 
    ? normalizedPath 
    : path.join(baseDir, normalizedPath);
  
  // 正規化（シンボリックリンクなどを解決）
  const resolvedPath = path.resolve(absolutePath);
  const resolvedBaseDir = path.resolve(baseDir);
  
  // パスが基準ディレクトリ内にあることを確認
  if (!resolvedPath.startsWith(resolvedBaseDir)) {
    throw new Error(`Path traversal attempt detected: ${filePath}`);
  }
  
  return resolvedPath;
}

/**
 * 指定されたファイルパスのファイルを安全に削除します
 * @param filePathToDelete 削除するファイルの絶対パス
 * @param options オプション設定
 */
export async function deleteFile(
  filePathToDelete: string,
  options?: {
    allowedBaseDir?: string;
    materialId?: string;
    skipValidation?: boolean;
  }
): Promise<void> {
  let validatedPath = filePathToDelete;
  
  try {
    // パス検証（オプションでスキップ可能）
    if (!options?.skipValidation && options?.allowedBaseDir) {
      validatedPath = validateAndNormalizePath(filePathToDelete, options.allowedBaseDir);
    }
    
    // ファイル削除
    await fs.unlink(validatedPath);
    
    // 成功ログ
    await logFileOperation({
      operation: 'delete',
      path: validatedPath,
      materialId: options?.materialId,
      success: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const fileError = error as FileSystemError;
    
    // エラーログ
    await logFileOperation({
      operation: 'delete',
      path: validatedPath,
      materialId: options?.materialId,
      success: false,
      error: fileError.message,
      timestamp: new Date().toISOString()
    });
    
    // ENOENTエラー（ファイルが存在しない）は特別扱い
    if (fileError.code === 'ENOENT') {
      console.info(`File already deleted or not found: ${validatedPath}`);
      // ENOENTの場合はエラーを投げない（冪等性を保証）
      return;
    }
    
    // その他のエラーは再スロー
    throw error;
  }
}

/**
 * ファイルが存在するかチェックします
 * @param filePath チェックするファイルのパス
 * @returns ファイルが存在する場合はtrue、存在しない場合はfalse
 */
export async function checkFileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    const fileError = error as FileSystemError;
    if (fileError.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

/**
 * ファイルを一時的にマーク（リネーム）します
 * @param filePath マークするファイルのパス
 * @returns マーク後のファイルパス
 */
export async function markFileForDeletion(filePath: string): Promise<string> {
  const markedPath = `${filePath}.deleted_${Date.now()}`;
  await fs.rename(filePath, markedPath);
  return markedPath;
}

/**
 * マークしたファイルを元に戻します
 * @param markedPath マークされたファイルのパス
 * @returns 元のファイルパス
 */
export async function unmarkFileForDeletion(markedPath: string): Promise<string> {
  const originalPath = markedPath.replace(/\.deleted_\d+$/, '');
  await fs.rename(markedPath, originalPath);
  return originalPath;
}

/**
 * 孤立したファイル（DBに存在しないファイル）をクリーンアップします
 * @param uploadsDir アップロードディレクトリのパス
 * @param options クリーンアップオプション
 */
export async function cleanupOrphanedFiles(
  uploadsDir: string,
  options?: {
    dryRun?: boolean;
    maxAge?: number; // ミリ秒単位
  }
): Promise<string[]> {
  const maxAge = options?.maxAge || 24 * 60 * 60 * 1000; // デフォルト24時間
  const deletedFiles: string[] = [];
  
  try {
    const files = await fs.readdir(uploadsDir);
    
    for (const file of files) {
      // .deleted_ プレフィックスのファイルを検出
      if (file.includes('.deleted_')) {
        const match = file.match(/\.deleted_(\d+)$/);
        if (match) {
          const timestamp = parseInt(match[1]);
          const age = Date.now() - timestamp;
          
          if (age > maxAge) {
            const filePath = path.join(uploadsDir, file);
            
            if (options?.dryRun) {
              console.log(`[DRY RUN] Would delete: ${filePath} (age: ${age}ms)`);
            } else {
              try {
                await fs.unlink(filePath);
                deletedFiles.push(filePath);
                console.log(`Cleaned up orphaned file: ${filePath}`);
              } catch (error) {
                console.error(`Failed to cleanup ${filePath}:`, error);
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error during orphaned files cleanup:', error);
  }
  
  return deletedFiles;
} 
