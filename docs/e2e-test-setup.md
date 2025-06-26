# E2E Test Setup Guide

## Overview

E2Eテストの実行には、特定のテストファイル（音声ファイルなど）が必要です。これらのファイルは`npm run e2e`実行時に自動的にセットアップされます。

## 自動セットアップ

### ローカル環境

`npm run e2e`を実行すると、以下の処理が自動的に行われます：

1. **データベースセットアップ**: テスト用データベースの作成とシード投入
2. **テストファイルセットアップ**: 必要なテストファイルの生成
   - `e2e/fixtures/test-audio.wav` - 5秒間の440Hz正弦波音声ファイル
   - その他のテスト用ファイル

### CI環境

GitHub Actionsでは、以下の処理が自動的に実行されます：

1. **テストファイル生成**: `tsx scripts/setup-e2e-files.ts`
2. **シードデータ用音声ファイル生成**: FFmpegを使用して`public/uploads/`に配置

## 必要なツール

### ローカル環境

以下のいずれかがインストールされている必要があります：

- **FFmpeg** (推奨)

  - macOS: `brew install ffmpeg`
  - Ubuntu: `sudo apt-get install ffmpeg`
  - Windows: [公式サイト](https://ffmpeg.org/download.html)からダウンロード

- **Sox** (代替)
  - macOS: `brew install sox`
  - Ubuntu: `sudo apt-get install sox`

### 手動セットアップ

個別にテストファイルをセットアップする場合：

```bash
# E2Eテストファイルのセットアップのみ
npx tsx scripts/setup-e2e-files.ts

# 古いシェルスクリプトを使用する場合（非推奨）
./e2e/fixtures/generate-test-audio.sh
```

## ファイル構成

### 必須ファイル

- `e2e/fixtures/test-audio.wav`
  - 多くのE2Eテストで使用される音声ファイル
  - 仕様: 5秒、44.1kHz、16bit、モノラル、440Hz

### オプションファイル

- `e2e/fixtures/photo-with-gps.jpg`
  - GPS位置情報テスト用の画像ファイル
  - 必要な場合は手動で追加

### シードデータ用ファイル

以下のファイルはCI環境で自動生成されます：

- `public/uploads/hot-spring.wav`
- `public/uploads/forest-morning.wav`
- その他多数（`seed-test-data.ts`で定義）

## トラブルシューティング

### テストファイルが見つからない

```bash
# 手動でセットアップを実行
npx tsx scripts/setup-e2e-files.ts
```

### FFmpegまたはSoxが見つからない

上記の「必要なツール」セクションを参照してインストールしてください。

### CI環境でのエラー

CI環境では自動的にFFmpegがインストールされるため、通常は問題ありません。エラーが発生した場合は、GitHub Actionsのログを確認してください。
