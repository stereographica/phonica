/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testEnvironment: 'jsdom', // Reactコンポーネントのテストのため 'jsdom' に変更
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1', // Path Aliases の設定
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'], // セットアップファイル (あれば)
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)'
  ], // テストファイルのパターンを明示
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageProvider: "v8",
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['@swc/jest', {
      sourceMaps: true, // ソースマップを有効にする（デバッグ用）
      jsc: {
        parser: {
          syntax: 'typescript',
          tsx: true,
          decorators: true, // デコレーターを使用している場合は true
          dynamicImport: true // dynamic import を使用している場合は true
        },
        transform: {
          react: {
            runtime: 'automatic', // React 17+ の新しいJSXトランスフォーム
          },
        },
        paths: { // tsconfig.json の paths を反映
          "@/*": ["./src/*"]
        },
        baseUrl: "." // プロジェクトルートを baseUrl として指定
      },
      module: {
        type: "commonjs" // Jest は CommonJS モジュールを期待する
      }
    }],
  },
  // Next.jsがCSSモジュールや画像ファイルを処理できるようにするための設定
  // moduleNameMapper: {
  //   '\\.(css|less|scss|sass)$‎': 'identity-obj-proxy',
  //   '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js',
  // },
  // Babelがnode_modules内の一部のライブラリもトランスパイルするように設定 (例: ES6+構文を使っているライブラリ)
  // transformIgnorePatterns: [
  //   '/node_modules/(?!some-es6-module)/.+',
  // ],
}; 
