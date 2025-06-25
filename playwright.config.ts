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
    ? [['list'], ['json', { outputFile: 'test-results/results.json' }]]
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
  timeout: process.env.CI ? 180 * 1000 : 90 * 1000, // CI: 3分, ローカル: 90秒
  expect: {
    timeout: process.env.CI ? 15 * 1000 : 10 * 1000, // CI: 15秒, ローカル: 10秒
  },

  /* Configure projects for major browsers with optimized settings */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Chrome固有の最適化
        launchOptions: {
          args: ['--disable-dev-shm-usage', '--no-sandbox'],
        },
      },
    },

    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        // Firefox固有の最適化
        launchOptions: {
          firefoxUserPrefs: {
            // CI環境用に並列処理を削減
            'dom.ipc.processCount': process.env.CI ? 1 : 8,
            'network.http.max-persistent-connections-per-server': process.env.CI ? 4 : 10,
            // メモリ使用量を削減
            'javascript.options.mem.max': 512000,
            'browser.tabs.remote.autostart': false,
            // 追加の安定性設定
            'media.webspeech.synth.enabled': false,
            'media.navigator.enabled': false,
          },
        },
        // Firefox専用のタイムアウト延長
        actionTimeout: process.env.CI ? 30000 : 15000,
        navigationTimeout: process.env.CI ? 60000 : 30000,
      },
      // Firefox専用のテストタイムアウト
      timeout: process.env.CI ? 300 * 1000 : 180 * 1000, // CI: 5分、ローカル: 3分
      retries: process.env.CI ? 1 : 0, // CI環境ではリトライを減らす
    },

    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        // WebKit固有の設定
      },
    },

    // テストグループごとのプロジェクト（並列実行の最適化）
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

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer設定はコメントアウト - run-e2e-with-db.tsが独自にサーバーを管理
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120 * 1000,
  // },
});
