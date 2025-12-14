import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e/tests',
  /* Test result output directory */
  outputDir: './test-results',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only - 安定性確保のため増加 */
  retries: process.env.CI ? 3 : 0,
  /* Optimized worker configuration for parallel database isolation */
  workers: process.env.CI ? 1 : 4, // CI環境では安定性優先で1、ローカルでは4並列で高速化
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI
    ? [
        ['list'],
        ['json', { outputFile: 'test-results/results.json' }],
        [
          'html',
          {
            open: 'never',
            outputFolder: 'playwright-report',
          },
        ],
      ]
    : [
        [
          'html',
          {
            open: 'never', // Changed from 'always' to prevent auto-opening
            outputFolder: 'playwright-report',
          },
        ],
        ['json', { outputFile: 'test-results/results.json' }],
        ['list'],
      ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
  },

  /* Global setup for worker isolation */
  globalSetup: require.resolve('./e2e/setup/global-setup.ts'),
  globalTeardown: require.resolve('./e2e/setup/global-teardown.ts'),

  /* Timeout configurations */
  timeout: 600 * 1000, // 10分（CI/ローカル問わず最大タイムアウトを使用）
  expect: {
    timeout: process.env.CI ? 15 * 1000 : 10 * 1000, // CI: 15秒, ローカル: 10秒
  },

  /* Configure projects for Chrome only */
  projects: [
    {
      name: 'chrome',
      use: {
        ...devices['Desktop Chrome'],
        // Chrome最適化設定
        launchOptions: {
          args: ['--disable-dev-shm-usage', '--no-sandbox'],
        },
      },
    },

    // テストグループごとのプロジェクト（Chrome上で並列実行の最適化）
    {
      name: 'smoke-tests',
      testMatch: '**/*smoke*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'material-tests',
      testMatch: '**/materials/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'master-tests',
      testMatch: '**/master/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'workflow-tests',
      testMatch: '**/workflows/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  // 開発サーバーはrun-e2e.tsで管理するため、ここでは設定しない
});
