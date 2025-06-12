import { exec } from 'child_process';
import { promisify } from 'util';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

// E2E用のデータベース設定
const E2E_DB_NAME = 'phonica_e2e_test';
const E2E_TEMPLATE_DB_NAME = 'phonica_e2e_template';
const E2E_DB_USER = process.env.POSTGRES_USER || 'phonica_user';
const E2E_DB_PASSWORD = process.env.POSTGRES_PASSWORD || 'phonica_password';
const E2E_DB_HOST = process.env.POSTGRES_HOST || 'localhost';
const E2E_DB_PORT = process.env.POSTGRES_PORT || '5432';

// 管理用のデータベースURL（postgres データベースに接続）
const ADMIN_DATABASE_URL = `postgresql://${E2E_DB_USER}:${E2E_DB_PASSWORD}@${E2E_DB_HOST}:${E2E_DB_PORT}/postgres`;
// E2E用のデータベースURL
export const E2E_DATABASE_URL = `postgresql://${E2E_DB_USER}:${E2E_DB_PASSWORD}@${E2E_DB_HOST}:${E2E_DB_PORT}/${E2E_DB_NAME}`;
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
      `DATABASE_URL="${TEMPLATE_DATABASE_URL}" tsx scripts/seed-test-data.ts`,
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
export async function createE2EDatabaseFromTemplate() {
  console.log('⚡ Creating E2E database from template...');

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: ADMIN_DATABASE_URL,
      },
    },
  });

  try {
    // 既存の接続を切断
    await prisma.$executeRawUnsafe(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = '${E2E_DB_NAME}' AND pid <> pg_backend_pid()
    `);

    // E2Eデータベースを削除
    await prisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS ${E2E_DB_NAME}`);

    // テンプレートからE2Eデータベースを作成（超高速）
    await prisma.$executeRawUnsafe(`
      CREATE DATABASE ${E2E_DB_NAME} 
      WITH TEMPLATE ${E2E_TEMPLATE_DB_NAME}
    `);

    console.log(`✅ E2E database created from template in milliseconds!`);
  } catch (error) {
    console.error('❌ Failed to create E2E database from template:', error);
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
export async function setupOptimizedE2EEnvironment() {
  const startTime = Date.now();

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
    await createE2EDatabaseFromTemplate();

    const duration = Date.now() - startTime;
    console.log(`✅ E2E environment setup completed in ${(duration / 1000).toFixed(2)}s`);
  } catch (error) {
    console.error('❌ E2E environment setup failed:', error);
    throw error;
  }
}

/**
 * E2Eデータベースのクリーンアップ（通常の削除のみ）
 */
export async function cleanupE2EDatabase() {
  console.log('🧹 Cleaning up E2E database...');

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: ADMIN_DATABASE_URL,
      },
    },
  });

  try {
    // 接続を切断
    await prisma.$executeRawUnsafe(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = '${E2E_DB_NAME}' AND pid <> pg_backend_pid()
    `);

    // データベースを削除
    await prisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS ${E2E_DB_NAME}`);
    console.log(`✅ E2E database cleaned up`);
  } catch (error) {
    console.error('❌ Failed to cleanup E2E database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * テンプレートも含めた完全クリーンアップ
 */
export async function fullCleanup() {
  console.log('🧹 Full cleanup including template...');

  await cleanupE2EDatabase();

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

// CLIとして実行された場合の処理
if (require.main === module) {
  const command = process.argv[2];

  async function run() {
    switch (command) {
      case 'setup':
        await setupOptimizedE2EEnvironment();
        break;
      case 'cleanup':
        await cleanupE2EDatabase();
        break;
      case 'full-cleanup':
        await fullCleanup();
        break;
      case 'template-setup':
        await setupTemplate();
        break;
      default:
        console.log(`
Usage: tsx scripts/e2e-db-optimized.ts [command]

Commands:
  setup          - Optimized E2E setup (uses template if available)
  cleanup        - Clean up E2E database only
  full-cleanup   - Clean up both E2E and template databases
  template-setup - Force recreate template database
        `);
        process.exit(1);
    }
  }

  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
