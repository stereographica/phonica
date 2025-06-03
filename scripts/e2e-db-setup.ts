import { exec } from 'child_process';
import { promisify } from 'util';
import { PrismaClient } from '@prisma/client';

const execAsync = promisify(exec);

// E2E用のデータベース設定
const E2E_DB_NAME = 'phonica_e2e_test';
const E2E_DB_USER = process.env.POSTGRES_USER || 'phonica_user';
const E2E_DB_PASSWORD = process.env.POSTGRES_PASSWORD || 'phonica_password';
const E2E_DB_HOST = process.env.POSTGRES_HOST || 'localhost';
const E2E_DB_PORT = process.env.POSTGRES_PORT || '5432';

// 管理用のデータベースURL（postgres データベースに接続）
const ADMIN_DATABASE_URL = `postgresql://${E2E_DB_USER}:${E2E_DB_PASSWORD}@${E2E_DB_HOST}:${E2E_DB_PORT}/postgres`;
// E2E用のデータベースURL
export const E2E_DATABASE_URL = `postgresql://${E2E_DB_USER}:${E2E_DB_PASSWORD}@${E2E_DB_HOST}:${E2E_DB_PORT}/${E2E_DB_NAME}`;

/**
 * E2E用データベースを作成
 */
export async function createE2EDatabase() {
  console.log('🗄️  Creating E2E test database...');
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: ADMIN_DATABASE_URL,
      },
    },
  });

  try {
    // 既存のデータベースを削除（存在する場合）
    await prisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS ${E2E_DB_NAME}`);
    console.log(`✅ Dropped existing database: ${E2E_DB_NAME}`);
    
    // 新しいデータベースを作成
    await prisma.$executeRawUnsafe(`CREATE DATABASE ${E2E_DB_NAME}`);
    console.log(`✅ Created database: ${E2E_DB_NAME}`);
  } catch (error) {
    console.error('❌ Failed to create E2E database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * E2E用データベースにマイグレーションを実行
 */
export async function runE2EMigrations() {
  console.log('🔄 Running migrations on E2E database...');
  
  try {
    const { stdout, stderr } = await execAsync(
      `DATABASE_URL="${E2E_DATABASE_URL}" npx prisma migrate deploy`,
      { cwd: process.cwd() }
    );
    
    if (stderr && !stderr.includes('Applying migration')) {
      console.error('Migration stderr:', stderr);
    }
    
    console.log('✅ Migrations completed');
    if (stdout) {
      console.log(stdout);
    }
  } catch (error) {
    console.error('❌ Failed to run migrations:', error);
    throw error;
  }
}

/**
 * E2E用データベースにテストデータを投入
 */
export async function seedE2EDatabase() {
  console.log('🌱 Seeding E2E database...');
  
  try {
    const { stdout, stderr } = await execAsync(
      `DATABASE_URL="${E2E_DATABASE_URL}" tsx scripts/seed-test-data.ts`,
      { cwd: process.cwd() }
    );
    
    if (stderr) {
      console.error('Seed stderr:', stderr);
    }
    
    console.log('✅ Seeding completed');
    if (stdout) {
      console.log(stdout);
    }
  } catch (error) {
    console.error('❌ Failed to seed database:', error);
    throw error;
  }
}

/**
 * E2E用データベースを削除
 */
export async function dropE2EDatabase() {
  console.log('🧹 Dropping E2E test database...');
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: ADMIN_DATABASE_URL,
      },
    },
  });

  try {
    // 接続を切断（データベースが使用中の場合）
    await prisma.$executeRawUnsafe(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = '${E2E_DB_NAME}' AND pid <> pg_backend_pid()
    `);
    
    // データベースを削除
    await prisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS ${E2E_DB_NAME}`);
    console.log(`✅ Dropped database: ${E2E_DB_NAME}`);
  } catch (error) {
    console.error('❌ Failed to drop E2E database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * E2E環境のフルセットアップ
 */
export async function setupE2EEnvironment() {
  try {
    await createE2EDatabase();
    await runE2EMigrations();
    await seedE2EDatabase();
    console.log('✅ E2E environment setup completed');
  } catch (error) {
    console.error('❌ E2E environment setup failed:', error);
    throw error;
  }
}

/**
 * E2E環境のクリーンアップ
 */
export async function cleanupE2EEnvironment() {
  try {
    await dropE2EDatabase();
    console.log('✅ E2E environment cleanup completed');
  } catch (error) {
    console.error('❌ E2E environment cleanup failed:', error);
    throw error;
  }
}

// CLIとして実行された場合の処理
if (require.main === module) {
  const command = process.argv[2];
  
  async function run() {
    switch (command) {
      case 'create':
        await createE2EDatabase();
        break;
      case 'migrate':
        await runE2EMigrations();
        break;
      case 'seed':
        await seedE2EDatabase();
        break;
      case 'drop':
        await dropE2EDatabase();
        break;
      case 'setup':
        await setupE2EEnvironment();
        break;
      case 'cleanup':
        await cleanupE2EEnvironment();
        break;
      default:
        console.log(`
Usage: tsx scripts/e2e-db-setup.ts [command]

Commands:
  create   - Create E2E database
  migrate  - Run migrations on E2E database
  seed     - Seed E2E database with test data
  drop     - Drop E2E database
  setup    - Full setup (create + migrate + seed)
  cleanup  - Drop E2E database
        `);
        process.exit(1);
    }
  }
  
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}