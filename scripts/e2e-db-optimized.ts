import { exec } from 'child_process';
import { promisify } from 'util';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

// E2E用のデータベース設定
const E2E_DB_BASE_NAME = 'phonica_e2e_test';
const E2E_TEMPLATE_DB_NAME = 'phonica_e2e_template';

// CI環境では標準的なPostgreSQL認証情報を使用、ローカル環境では専用認証情報を使用
const isCI = process.env.CI === 'true';
const E2E_DB_USER = process.env.POSTGRES_USER || (isCI ? 'postgres' : 'phonica_user');
const E2E_DB_PASSWORD = process.env.POSTGRES_PASSWORD || (isCI ? 'postgres' : 'phonica_password');
const E2E_DB_HOST = process.env.POSTGRES_HOST || 'localhost';
const E2E_DB_PORT = process.env.POSTGRES_PORT || '5432';

/**
 * Worker IDを取得（環境変数からまたは自動生成）
 * 複数ターミナルでの同時実行を考慮してユニーク性を強化
 */
export function getWorkerID(): string {
  const pid = process.pid;
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);

  // PlaywrightのWorker IDを環境変数から取得
  const pwWorker = process.env.PLAYWRIGHT_WORKER_INDEX;
  if (pwWorker !== undefined) {
    // Playwright環境でも、プロセスIDと時間戳、ランダム値を含めてユニーク性を確保
    return `w${pwWorker}_p${pid.toString(36)}_${timestamp}_${random}`;
  }

  // プロセスIDベースのWorker ID生成（フォールバック）
  return `p${pid.toString(36)}_${timestamp}_${random}`;
}

/**
 * E2Eテストセッション用の一意のIDを生成
 * 各テスト実行（ターミナル）ごとに一意のデータベースを作成するため
 */
export function generateSessionID(): string {
  const pid = process.pid;
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `s${pid.toString(36)}_${timestamp}_${random}`;
}

/**
 * セッションIDを取得（環境変数から）
 * 環境変数に設定されていない場合はnullを返す
 */
export function getSessionID(): string | null {
  return process.env.E2E_SESSION_ID || null;
}

/**
 * Worker固有のデータベース名を生成
 * PostgreSQLの命名規則に従って安全な名前を生成
 */
export function getWorkerDbName(workerId?: string): string {
  const wid = workerId || getWorkerID();
  // ハイフンをアンダースコアに変換、英数字とアンダースコアのみを許可
  const sanitizedWid = wid.replace(/[^a-zA-Z0-9_]/g, '_');
  return `${E2E_DB_BASE_NAME}_${sanitizedWid}`;
}

/**
 * セッション固有のデータベース名を生成
 * PostgreSQLの命名規則に従って安全な名前を生成
 */
export function getSessionDbName(sessionId?: string): string {
  const sid = sessionId || getSessionID() || generateSessionID();
  // ハイフンをアンダースコアに変換、英数字とアンダースコアのみを許可
  const sanitizedSid = sid.replace(/[^a-zA-Z0-9_]/g, '_');
  return `${E2E_DB_BASE_NAME}_${sanitizedSid}`;
}

// 管理用のデータベースURL（postgres データベースに接続）
const ADMIN_DATABASE_URL = `postgresql://${E2E_DB_USER}:${E2E_DB_PASSWORD}@${E2E_DB_HOST}:${E2E_DB_PORT}/postgres`;

// E2E用のデータベースURL（Worker固有）
export function getE2EDatabaseURL(workerId?: string): string {
  const workerDbName = getWorkerDbName(workerId);
  return `postgresql://${E2E_DB_USER}:${E2E_DB_PASSWORD}@${E2E_DB_HOST}:${E2E_DB_PORT}/${workerDbName}`;
}

// E2E用のデータベースURL（セッション固有）
export function getSessionDatabaseURL(sessionId?: string): string {
  const sessionDbName = getSessionDbName(sessionId);
  return `postgresql://${E2E_DB_USER}:${E2E_DB_PASSWORD}@${E2E_DB_HOST}:${E2E_DB_PORT}/${sessionDbName}`;
}

// 後方互換性のためのエクスポート（デフォルトWorker用）
export const E2E_DATABASE_URL = getE2EDatabaseURL();

// テンプレート用のデータベースURL
const TEMPLATE_DATABASE_URL = `postgresql://${E2E_DB_USER}:${E2E_DB_PASSWORD}@${E2E_DB_HOST}:${E2E_DB_PORT}/${E2E_TEMPLATE_DB_NAME}`;

// テンプレートの作成状態を記録するファイル
const TEMPLATE_STATE_FILE = path.join(process.cwd(), '.e2e-template-state.json');

interface TemplateState {
  created: boolean;
  version: string;
  createdAt: string;
  migrationHash?: string;
}

/**
 * 現在のマイグレーションのハッシュを取得
 */
async function getMigrationHash(): Promise<string> {
  const migrationDir = path.join(process.cwd(), 'prisma', 'migrations');
  const { stdout } = await execAsync(
    `find ${migrationDir} -type f -name "*.sql" | xargs md5sum | sort | md5sum`,
  );
  return stdout.trim().split(' ')[0];
}

/**
 * テンプレートの状態を読み込む
 */
function loadTemplateState(): TemplateState | null {
  try {
    if (fs.existsSync(TEMPLATE_STATE_FILE)) {
      return JSON.parse(fs.readFileSync(TEMPLATE_STATE_FILE, 'utf-8'));
    }
  } catch (error) {
    console.error('Failed to load template state:', error);
  }
  return null;
}

/**
 * テンプレートの状態を保存
 */
function saveTemplateState(state: TemplateState) {
  fs.writeFileSync(TEMPLATE_STATE_FILE, JSON.stringify(state, null, 2));
}

/**
 * テンプレートが最新かどうか確認
 */
async function isTemplateUpToDate(): Promise<boolean> {
  const state = loadTemplateState();
  if (!state || !state.created) return false;

  // マイグレーションが変更されていないか確認
  const currentHash = await getMigrationHash();
  return state.migrationHash === currentHash;
}

/**
 * E2Eテンプレートデータベースを作成
 */
export async function createTemplateDatabase() {
  console.log('🎯 Creating E2E template database...');

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: ADMIN_DATABASE_URL,
      },
    },
  });

  try {
    // 既存のテンプレートデータベースがある場合、まずテンプレートフラグを解除
    try {
      await prisma.$executeRawUnsafe(`
        UPDATE pg_database 
        SET datistemplate = false 
        WHERE datname = '${E2E_TEMPLATE_DB_NAME}'
      `);
      console.log(`✅ Unfroze existing template database: ${E2E_TEMPLATE_DB_NAME}`);
    } catch {
      // データベースが存在しない場合は無視
      console.log('ℹ️ No existing template database to unfreeze');
    }

    // 既存のテンプレートデータベースを削除
    await prisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS ${E2E_TEMPLATE_DB_NAME}`);
    console.log(`✅ Dropped existing template database: ${E2E_TEMPLATE_DB_NAME}`);

    // 新しいテンプレートデータベースを作成
    await prisma.$executeRawUnsafe(`CREATE DATABASE ${E2E_TEMPLATE_DB_NAME}`);
    console.log(`✅ Created template database: ${E2E_TEMPLATE_DB_NAME}`);
  } catch (error) {
    console.error('❌ Failed to create template database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * テンプレートデータベースにマイグレーションを実行
 */
export async function runTemplateMigrations() {
  console.log('🔄 Running migrations on template database...');

  try {
    const { stdout, stderr } = await execAsync(
      `DATABASE_URL="${TEMPLATE_DATABASE_URL}" npx prisma migrate deploy`,
      { cwd: process.cwd() },
    );

    if (stderr && !stderr.includes('Applying migration')) {
      console.error('Migration stderr:', stderr);
    }

    console.log('✅ Migrations completed on template');
    if (stdout) {
      console.log(stdout);
    }
  } catch (error) {
    console.error('❌ Failed to run migrations on template:', error);
    throw error;
  }
}

/**
 * テンプレートデータベースにテストデータを投入
 */
export async function seedTemplateDatabase() {
  console.log('🌱 Seeding template database...');

  try {
    const { stdout, stderr } = await execAsync(
      `DATABASE_URL="${TEMPLATE_DATABASE_URL}" npx tsx scripts/seed-test-data.ts`,
      { cwd: process.cwd() },
    );

    if (stderr) {
      console.error('Seed stderr:', stderr);
    }

    console.log('✅ Seeding completed on template');
    if (stdout) {
      console.log(stdout);
    }
  } catch (error) {
    console.error('❌ Failed to seed template database:', error);
    throw error;
  }
}

/**
 * テンプレートデータベースをフリーズ（変更不可にする）
 */
export async function freezeTemplateDatabase() {
  console.log('❄️ Freezing template database...');

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: ADMIN_DATABASE_URL,
      },
    },
  });

  try {
    // データベースをテンプレートとしてマーク
    await prisma.$executeRawUnsafe(`
      UPDATE pg_database 
      SET datistemplate = true 
      WHERE datname = '${E2E_TEMPLATE_DB_NAME}'
    `);
    console.log(`✅ Template database frozen: ${E2E_TEMPLATE_DB_NAME}`);
  } catch (error) {
    console.error('❌ Failed to freeze template database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * テンプレートからE2Eデータベースを高速作成
 */
export async function createE2EDatabaseFromTemplate(workerId?: string) {
  const workerDbName = getWorkerDbName(workerId);
  console.log(`⚡ Creating E2E database from template: ${workerDbName}...`);

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: ADMIN_DATABASE_URL,
      },
    },
  });

  try {
    // 既存の接続を切断
    const terminateResult = await prisma.$executeRawUnsafe(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = '${workerDbName}' AND pid <> pg_backend_pid()
    `);

    console.log(
      `🔌 Terminated ${Array.isArray(terminateResult) ? terminateResult.length : 0} connections for ${workerDbName}`,
    );

    // 接続切断の完了を待つ（PostgreSQLの接続クリーンアップ時間を考慮）
    await new Promise((resolve) => setTimeout(resolve, 100));

    // E2Eデータベースを削除（リトライ機構付き）
    let dropRetries = 3;
    while (dropRetries > 0) {
      try {
        await prisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS ${workerDbName}`);
        console.log(`🗑️ Successfully dropped database: ${workerDbName}`);
        break;
      } catch (dropError) {
        dropRetries--;
        if (dropRetries === 0) {
          console.error(`❌ Failed to drop database after retries: ${workerDbName}`, dropError);
          throw dropError;
        }
        console.log(`⏳ Retrying database drop (${3 - dropRetries}/3): ${workerDbName}`);
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    // テンプレートからE2Eデータベースを作成（超高速）
    await prisma.$executeRawUnsafe(`
      CREATE DATABASE ${workerDbName} 
      WITH TEMPLATE ${E2E_TEMPLATE_DB_NAME}
    `);

    console.log(`✅ E2E database created from template successfully: ${workerDbName}`);
  } catch (error) {
    console.error(`❌ Failed to create E2E database from template: ${workerDbName}`, error);

    // デバッグ情報を出力
    try {
      const existingDbs = await prisma.$queryRaw<Array<{ datname: string }>>`
        SELECT datname FROM pg_database WHERE datname = ${workerDbName}
      `;
      console.log(
        `🔍 Database existence check: ${existingDbs.length > 0 ? 'EXISTS' : 'NOT EXISTS'}`,
      );
    } catch (debugError) {
      console.log(`🔍 Debug query failed:`, debugError);
    }

    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * テンプレートのフルセットアップ
 */
export async function setupTemplate() {
  console.log('🚀 Setting up E2E template database...');

  try {
    await createTemplateDatabase();
    await runTemplateMigrations();
    await seedTemplateDatabase();
    await freezeTemplateDatabase();

    // テンプレートの状態を保存
    const migrationHash = await getMigrationHash();
    const state: TemplateState = {
      created: true,
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      migrationHash,
    };
    saveTemplateState(state);

    console.log('✅ Template setup completed');
  } catch (error) {
    console.error('❌ Template setup failed:', error);
    throw error;
  }
}

/**
 * 最適化されたE2E環境のセットアップ
 */
export async function setupOptimizedE2EEnvironment(workerId?: string): Promise<string> {
  const startTime = Date.now();
  const workerDbName = getWorkerDbName(workerId);

  try {
    // テンプレートが最新かチェック
    const templateUpToDate = await isTemplateUpToDate();

    if (!templateUpToDate) {
      console.log('📋 Template is outdated or missing. Creating new template...');
      await setupTemplate();
    } else {
      console.log('✅ Template is up to date');
    }

    // テンプレートからE2Eデータベースを高速作成
    await createE2EDatabaseFromTemplate(workerId);

    const duration = Date.now() - startTime;
    console.log(
      `✅ E2E environment setup completed for ${workerDbName} in ${(duration / 1000).toFixed(2)}s`,
    );

    // データベースURLを返す
    const dbUrl = `postgresql://${E2E_DB_USER}:${E2E_DB_PASSWORD}@${E2E_DB_HOST}:${E2E_DB_PORT}/${workerDbName}`;
    return dbUrl;
  } catch (error) {
    console.error(`❌ E2E environment setup failed for ${workerDbName}:`, error);
    throw error;
  }
}

/**
 * セッション用のE2Eデータベースを作成
 */
export async function createSessionDatabase(sessionId?: string) {
  const sessionDbName = getSessionDbName(sessionId);
  console.log(`⚡ Creating E2E session database from template: ${sessionDbName}...`);

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: ADMIN_DATABASE_URL,
      },
    },
  });

  try {
    // 既存の接続を切断
    const terminateResult = await prisma.$executeRawUnsafe(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = '${sessionDbName}' AND pid <> pg_backend_pid()
    `);

    console.log(
      `🔌 Terminated ${Array.isArray(terminateResult) ? terminateResult.length : 0} connections for ${sessionDbName}`,
    );

    // 接続切断の完了を待つ
    await new Promise((resolve) => setTimeout(resolve, 100));

    // E2Eデータベースを削除（リトライ機構付き）
    let dropRetries = 3;
    while (dropRetries > 0) {
      try {
        await prisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS ${sessionDbName}`);
        console.log(`🗑️ Successfully dropped database: ${sessionDbName}`);
        break;
      } catch (dropError) {
        dropRetries--;
        if (dropRetries === 0) {
          console.error(`❌ Failed to drop database after retries: ${sessionDbName}`, dropError);
          throw dropError;
        }
        console.log(`⏳ Retrying database drop (${3 - dropRetries}/3): ${sessionDbName}`);
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    // テンプレートからE2Eデータベースを作成（超高速）
    await prisma.$executeRawUnsafe(`
      CREATE DATABASE ${sessionDbName} 
      WITH TEMPLATE ${E2E_TEMPLATE_DB_NAME}
    `);

    console.log(`✅ E2E session database created from template successfully: ${sessionDbName}`);
  } catch (error) {
    console.error(
      `❌ Failed to create E2E session database from template: ${sessionDbName}`,
      error,
    );
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * セッション用のE2E環境セットアップ
 */
export async function setupSessionE2EEnvironment(sessionId?: string): Promise<string> {
  const startTime = Date.now();
  const actualSessionId = sessionId || generateSessionID();
  const sessionDbName = getSessionDbName(actualSessionId);

  try {
    // テンプレートが最新かチェック
    const templateUpToDate = await isTemplateUpToDate();

    if (!templateUpToDate) {
      console.log('📋 Template is outdated or missing. Creating new template...');
      await setupTemplate();
    } else {
      console.log('✅ Template is up to date');
    }

    // セッション用のデータベースを作成
    await createSessionDatabase(actualSessionId);

    const duration = Date.now() - startTime;
    console.log(
      `✅ E2E session environment setup completed for ${sessionDbName} in ${(duration / 1000).toFixed(2)}s`,
    );

    // データベースURLを返す
    const dbUrl = getSessionDatabaseURL(actualSessionId);
    return dbUrl;
  } catch (error) {
    console.error(`❌ E2E session environment setup failed for ${sessionDbName}:`, error);
    throw error;
  }
}

/**
 * セッション用のE2Eデータベースクリーンアップ
 */
export async function cleanupSessionDatabase(sessionId?: string) {
  const sessionDbName = getSessionDbName(sessionId);
  console.log(`🧹 Cleaning up E2E session database: ${sessionDbName}...`);

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: ADMIN_DATABASE_URL,
      },
    },
  });

  try {
    // 接続を切断
    const terminateResult = await prisma.$executeRawUnsafe(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = '${sessionDbName}' AND pid <> pg_backend_pid()
    `);

    console.log(
      `🔌 Terminated ${Array.isArray(terminateResult) ? terminateResult.length : 0} connections for cleanup: ${sessionDbName}`,
    );

    // 接続切断の完了を待つ
    await new Promise((resolve) => setTimeout(resolve, 100));

    // データベースを削除（リトライ機構付き）
    let dropRetries = 3;
    while (dropRetries > 0) {
      try {
        await prisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS ${sessionDbName}`);
        console.log(`✅ E2E session database cleaned up successfully: ${sessionDbName}`);
        break;
      } catch (dropError) {
        dropRetries--;
        if (dropRetries === 0) {
          console.error(
            `❌ Failed to cleanup session database after retries: ${sessionDbName}`,
            dropError,
          );
          throw dropError;
        }
        console.log(`⏳ Retrying cleanup (${3 - dropRetries}/3): ${sessionDbName}`);
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }
  } catch (error) {
    console.error(`❌ Failed to cleanup E2E session database: ${sessionDbName}`, error);
    // クリーンアップ時はエラーを投げずに警告のみ
    console.warn(`⚠️ Cleanup may have failed, but continuing: ${sessionDbName}`);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * E2Eデータベースのクリーンアップ（通常の削除のみ）
 */
export async function cleanupE2EDatabase(workerId?: string) {
  const workerDbName = getWorkerDbName(workerId);
  console.log(`🧹 Cleaning up E2E database: ${workerDbName}...`);

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: ADMIN_DATABASE_URL,
      },
    },
  });

  try {
    // 接続を切断
    const terminateResult = await prisma.$executeRawUnsafe(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = '${workerDbName}' AND pid <> pg_backend_pid()
    `);

    console.log(
      `🔌 Terminated ${Array.isArray(terminateResult) ? terminateResult.length : 0} connections for cleanup: ${workerDbName}`,
    );

    // 接続切断の完了を待つ
    await new Promise((resolve) => setTimeout(resolve, 100));

    // データベースを削除（リトライ機構付き）
    let dropRetries = 3;
    while (dropRetries > 0) {
      try {
        await prisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS ${workerDbName}`);
        console.log(`✅ E2E database cleaned up successfully: ${workerDbName}`);
        break;
      } catch (dropError) {
        dropRetries--;
        if (dropRetries === 0) {
          console.error(`❌ Failed to cleanup database after retries: ${workerDbName}`, dropError);
          throw dropError;
        }
        console.log(`⏳ Retrying cleanup (${3 - dropRetries}/3): ${workerDbName}`);
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }
  } catch (error) {
    console.error(`❌ Failed to cleanup E2E database: ${workerDbName}`, error);
    // クリーンアップ時はエラーを投げずに警告のみ（既存のデータベースが無い場合もあるため）
    console.warn(`⚠️ Cleanup may have failed, but continuing: ${workerDbName}`);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * テンプレートも含めた完全クリーンアップ
 */
export async function fullCleanup(workerId?: string) {
  console.log('🧹 Full cleanup including template...');

  await cleanupE2EDatabase(workerId);

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: ADMIN_DATABASE_URL,
      },
    },
  });

  try {
    // テンプレートのフラグを解除
    await prisma.$executeRawUnsafe(`
      UPDATE pg_database 
      SET datistemplate = false 
      WHERE datname = '${E2E_TEMPLATE_DB_NAME}'
    `);

    // テンプレートデータベースを削除
    await prisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS ${E2E_TEMPLATE_DB_NAME}`);
    console.log(`✅ Template database cleaned up`);

    // 状態ファイルを削除
    if (fs.existsSync(TEMPLATE_STATE_FILE)) {
      fs.unlinkSync(TEMPLATE_STATE_FILE);
    }
  } catch (error) {
    console.error('❌ Failed to cleanup template:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * すべてのWorker用データベースをクリーンアップ
 */
export async function cleanupAllWorkerDatabases() {
  console.log('🧹 Cleaning up all worker databases...');

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: ADMIN_DATABASE_URL,
      },
    },
  });

  try {
    // E2Eテスト用データベース一覧を取得
    const result = await prisma.$queryRaw<Array<{ datname: string }>>`
      SELECT datname FROM pg_database 
      WHERE datname LIKE ${E2E_DB_BASE_NAME + '_%'}
    `;

    for (const db of result) {
      console.log(`Dropping database: ${db.datname}`);

      // 接続を切断
      await prisma.$executeRawUnsafe(`
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = '${db.datname}' AND pid <> pg_backend_pid()
      `);

      // データベースを削除
      await prisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS ${db.datname}`);
    }

    console.log(`✅ Cleaned up ${result.length} worker databases`);
  } catch (error) {
    console.error('❌ Failed to cleanup worker databases:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// CLIとして実行された場合の処理
if (require.main === module) {
  const command = process.argv[2];

  async function run() {
    const workerId = process.argv[3]; // オプションのworker ID

    switch (command) {
      case 'setup':
        await setupOptimizedE2EEnvironment(workerId);
        break;
      case 'cleanup':
        await cleanupE2EDatabase(workerId);
        break;
      case 'cleanup-all':
        await cleanupAllWorkerDatabases();
        break;
      case 'full-cleanup':
        await fullCleanup(workerId);
        break;
      case 'template-setup':
        await setupTemplate();
        break;
      default:
        console.log(`
Usage: tsx scripts/e2e-db-optimized.ts [command] [worker-id]

Commands:
  setup [worker-id]     - Optimized E2E setup (uses template if available)
  cleanup [worker-id]   - Clean up specific worker E2E database
  cleanup-all           - Clean up ALL worker databases
  full-cleanup          - Clean up both E2E and template databases
  template-setup        - Force recreate template database

Examples:
  tsx scripts/e2e-db-optimized.ts setup w1
  tsx scripts/e2e-db-optimized.ts cleanup w2
  tsx scripts/e2e-db-optimized.ts cleanup-all
        `);
        process.exit(1);
    }
  }

  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
