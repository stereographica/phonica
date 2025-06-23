# システム要件

このドキュメントでは、Phonicaフィールドレコーディング素材管理ツールを実行するためのシステム要件について説明します。

## 概要

Phonicaは、自動音声メタデータ抽出機能を備えたフィールドレコーディング素材を管理するWebベースのアプリケーションです。システムは、Next.js Webアプリケーション、非同期処理用のバックグラウンドワーカー、および音声ファイル解析用の特定のシステム依存関係で構成されています。

## 最小システム要件

### ハードウェア要件

- **CPU**: 2コア（4コア推奨）
- **RAM**: 最低4GB（8GB推奨）
- **ストレージ**:
  - アプリケーションと依存関係用に2GB
  - 音声ファイルストレージ用の追加容量（使用量によって変動）
- **ネットワーク**: Webアクセス用の安定したインターネット接続

### オペレーティングシステム

- **Linux**: Ubuntu 20.04 LTS以降、Debian 10+、CentOS 8+、または任意の最新Linuxディストリビューション
- **macOS**: macOS 11（Big Sur）以降
- **Windows**: WSL2（Windows Subsystem for Linux）を使用したWindows 10/11

## ソフトウェア依存関係

### コア要件

1. **Node.js**: v20.0.0以上（LTSバージョン推奨）

   ```bash
   # バージョン確認
   node --version
   ```

2. **npm**: v10.0.0以上（Node.jsに付属）

   ```bash
   # バージョン確認
   npm --version
   ```

3. **PostgreSQL**: v14.0以上

   - データ永続化に必要
   - ローカルインストールまたはDocker経由で利用可能

   ```bash
   # バージョン確認
   psql --version
   ```

4. **Redis**: v6.0以上
   - バックグラウンドジョブキュー管理に必要
   - ローカルインストールまたはDocker経由で利用可能
   ```bash
   # バージョン確認
   redis-server --version
   ```

### 音声処理要件

5. **FFmpeg**: v4.0以上（音声メタデータ抽出に必須）

   - メタデータ解析にはffprobeが必要

   **インストール方法:**

   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install ffmpeg

   # macOS（Homebrewを使用）
   brew install ffmpeg

   # CentOS/RHEL/Fedora
   sudo dnf install ffmpeg

   # インストール確認
   ffmpeg -version
   ffprobe -version
   ```

### オプション（推奨）

6. **Docker**: v20.10以上
   - コンテナ化デプロイメント用
   - Docker Compose v2.0以上
   ```bash
   # バージョン確認
   docker --version
   docker-compose --version
   ```

## ブラウザ要件

Webインターフェースは最新ブラウザをサポートします：

- **Chrome/Chromium**: v90以上
- **Firefox**: v88以上
- **Safari**: v14以上
- **Edge**: v90以上

**注意**: Internet Explorerはサポートされていません。

## ネットワーク要件

### ポート

以下のポートが利用可能である必要があります：

- **3000**: Next.js Webアプリケーション（設定可能）
- **5432**: PostgreSQLデータベース
- **6379**: Redisサーバー

### ファイアウォール設定

ファイアウォール配下で実行する場合は、以下を確認してください：

- ポート3000（または設定されたアプリケーションポート）への受信アクセス
- npmパッケージインストール用のHTTPS送信アクセス
- アプリケーションとデータベース/Redisサービス間の内部アクセス

## ファイルシステム要件

### ディレクトリ権限

アプリケーションには以下への読み書きアクセスが必要です：

- `/public/uploads/materials/`: 永続音声ファイルストレージ
- `/tmp/phonica-uploads/`: 処理中の一時ファイルストレージ
- Next.jsキャッシュとビルドファイル用のアプリケーションディレクトリ

### ファイルアップロード制限

- **最大ファイルサイズ**: 音声ファイルあたり100MB（設定可能）
- **サポート形式**: MP3、WAV、FLAC、M4A、OGG、AAC、WMA
- **一時ストレージ**: 大きなファイル処理用に最低500MB

## パフォーマンス考慮事項

### 同時処理

- システムは複数ファイルのアップロードを同時に処理可能
- バックグラウンドワーカーがメタデータ抽出を非同期処理
- 推奨：CPUコア2つにつき1ワーカー

### メモリ使用量

- ベースアプリケーション：約500MB
- 同時アップロードあたり：約50-100MB（ファイルサイズに依存）
- PostgreSQL：最低200MB
- Redis：最低100MB

### スケーリング推奨事項

高使用量の本番デプロイメントの場合：

- Web、ワーカー、データベース、Redisを別サーバー/コンテナで分離
- 複数Webインスタンス用のロードバランシングを実装
- 高可用性のためにRedisクラスタリングを使用
- 音声ファイル用にオブジェクトストレージ（S3等）を検討

## Dockerデプロイメント

### Dockerシステム要件

Dockerを使用する場合の確認事項：

- Dockerデーモンに最低4GBのメモリが割り当てられている
- イメージとボリューム用の十分なディスク容量
- 最適なビルドパフォーマンスのためにDocker BuildKitが有効

### プリビルドイメージ

アプリケーションには以下のDockerfileが含まれています：

- Webサービス（FFmpeg事前インストール済み）
- ワーカーサービス（FFmpeg事前インストール済み）
- 開発環境セットアップ

## インストール確認

すべての依存関係をインストール後、セットアップを確認：

```bash
# Node.jsの確認
node --version

# PostgreSQLの確認
pg_isready

# Redisの確認
redis-cli ping

# FFmpegとffprobeの確認
ffmpeg -version
ffprobe -version

# ffprobeが音声解析可能か確認
ffprobe -v quiet -print_format json -show_format -show_streams /path/to/test/audio.mp3
```

## トラブルシューティング

### よくある問題

1. **FFmpegが見つからない**
   - エラー: "ffprobe command not found"
   - 解決策: パッケージマネージャーでFFmpegをインストール

2. **データベース接続失敗**
   - エラー: "ECONNREFUSED ::1:5432"
   - 解決策: PostgreSQLが起動し、接続を受け付けていることを確認

3. **Redis接続失敗**
   - エラー: "Redis connection to localhost:6379 failed"
   - 解決策: Redisサービスを開始

4. **ファイルアップロード失敗**
   - エラー: "EACCES: permission denied"
   - 解決策: uploadsフォルダのディレクトリ権限を確認

### サポートを受ける

追加サポートについては：

- コンテナ化デプロイメントの場合は[Dockerセットアップガイド](./docker-setup.md)を確認
- 開発モードでアプリケーションログを確認
- すべてのシステム要件が満たされていることを確認

## セキュリティ考慮事項

1. **ファイルアップロード**: 本番デプロイメントではウイルススキャンを実装
2. **FFmpeg**: セキュリティ脆弱性の修正のためFFmpegを最新に保つ
3. **データベース**: 強力なパスワードと暗号化接続を使用
4. **ファイル権限**: アップロードディレクトリへのアクセスを制限
5. **ネットワーク**: 本番環境でHTTPSを使用、レート制限を実装

---

最終更新：2025年6月23日