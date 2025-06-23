# Docker セットアップガイド

このガイドでは、開発環境と本番環境の両方でDockerを使用してPhonicaを実行する方法を説明します。

## 前提条件

- Docker Desktop（Mac/Windows用）またはDocker Engine（Linux用）
- Docker Compose v2.0以上
- Docker用に最低4GBのRAMが利用可能

## アーキテクチャ概要

Dockerセットアップには以下のサービスが含まれます：

1. **PostgreSQL** - アプリケーションデータ用のプライマリデータベース
2. **Redis** - バックグラウンドジョブのキュー管理
3. **Web** - Next.jsアプリケーションサーバー
4. **Worker** - ファイルクリーンアップと非同期タスク用のバックグラウンドジョブプロセッサ

## 開発環境セットアップ

開発では、ホットリロード機能のために、インフラサービス（PostgreSQLとRedis）のみをDockerで実行し、アプリケーションはローカルで実行することを推奨します。

### 1. インフラサービスの起動

```bash
# PostgreSQLとRedisの起動
docker-compose -f docker-compose.dev.yml up -d

# サービスが実行中であることを確認
docker-compose -f docker-compose.dev.yml ps
```

### 2. 環境変数の設定

```bash
# 環境変数ファイルのコピー
cp .env.example .env.local

# localhostを使用するようにDATABASE_URLとREDIS_URLを更新
DATABASE_URL=postgresql://phonica_user:phonica_password@localhost:5432/phonica_db
REDIS_URL=redis://localhost:6379
```

### 3. アプリケーションのローカル実行

```bash
# 依存関係のインストール
npm install

# データベースマイグレーションの実行
npx prisma migrate dev

# 開発サーバーの起動
npm run dev

# 別のターミナルでワーカーを起動
npm run worker:dev
```

## 本番環境セットアップ

本番環境では、すべてのサービスがDockerコンテナで実行されます。

### 1. 環境変数の設定

```bash
# Docker用環境変数ファイルのコピー
cp .env.docker.example .env.docker

# 本番環境の値で.env.dockerを編集
# 重要：安全なNEXTAUTH_SECRETを生成
openssl rand -base64 32
```

### 2. イメージのビルドとサービス起動

```bash
# イメージをビルドしてすべてのサービスを起動
docker-compose up -d --build

# ログの確認
docker-compose logs -f

# サービスの状態確認
docker-compose ps
```

### 3. データベースの初期化

初回実行時は、データベースマイグレーションが自動的に適用されます。手動で実行することも可能です：

```bash
docker-compose exec web npx prisma migrate deploy
```

### 4. 初期データ作成（オプション）

```bash
# サンプルデータでデータベースをシード
docker-compose exec web npx prisma db seed
```

## サービス管理

### サービスの起動

```bash
# すべてのサービスを起動
docker-compose up -d

# 特定のサービスを起動
docker-compose up -d postgres redis
```

### サービスの停止

```bash
# すべてのサービスを停止
docker-compose down

# ボリュームも削除して停止（警告：すべてのデータが削除されます）
docker-compose down -v
```

### ログの確認

```bash
# すべてのサービス
docker-compose logs -f

# 特定のサービス
docker-compose logs -f web
docker-compose logs -f worker
```

### サービスへのアクセス

- **Webアプリケーション**: http://localhost:3000
- **PostgreSQL**: localhost:5432（任意のPostgreSQLクライアントを使用）
- **Redis**: localhost:6379（redis-cliまたは任意のRedisクライアントを使用）

## ファイルアップロードとストレージ

Dockerセットアップには、ファイルアップロード用の適切なボリュームマウントが含まれています：

- **アップロードファイル**: `./public/uploads`（ホストに永続化）
- **一時ファイル**: Dockerボリューム`temp_uploads`（自動クリーンアップ）

ワーカーサービスは、1時間より古い一時ファイルの定期的なクリーンアップを実行します。

## トラブルシューティング

### コンテナが起動しない

```bash
# エラーのログを確認
docker-compose logs web
docker-compose logs worker

# イメージを再ビルド
docker-compose build --no-cache
```

### データベース接続の問題

```bash
# PostgreSQLの準備状況を確認
docker-compose exec postgres pg_isready

# 接続をテスト
docker-compose exec postgres psql -U phonica_user -d phonica_db
```

### ファイル権限の問題

```bash
# アップロードディレクトリの権限を修正
docker-compose exec web chown -R nextjs:nodejs /app/public/uploads
docker-compose exec worker chown -R worker:nodejs /app/public/uploads
```

### FFmpeg/FFprobeが動作しない

Dockerイメージには音声メタデータ抽出用のFFmpegが含まれています。確認方法：

```bash
# FFmpegのインストールを確認
docker-compose exec web ffmpeg -version
docker-compose exec worker ffprobe -version
```

## パフォーマンス最適化

### リソース制限

docker-compose.ymlにリソース制限を追加：

```yaml
services:
  web:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

### 本番環境最適化

1. より高速なビルドのためにDocker BuildKitを使用：

   ```bash
   DOCKER_BUILDKIT=1 docker-compose build
   ```

2. Next.jsスタンドアロン出力を有効化（Dockerfileで既に設定済み）

3. イメージサイズ削減のためのマルチステージビルドを使用（既に実装済み）

## バックアップと復元

### データベースバックアップ

```bash
# バックアップ作成
docker-compose exec postgres pg_dump -U phonica_user phonica_db > backup.sql

# バックアップ復元
docker-compose exec -T postgres psql -U phonica_user phonica_db < backup.sql
```

### ファイルバックアップ

```bash
# アップロードファイルのバックアップ
tar -czf uploads-backup.tar.gz ./public/uploads
```

## セキュリティ考慮事項

1. **デフォルトパスワードの変更** - 本番環境では必須
2. **シークレット管理** - 機密環境変数にはシークレット管理を使用
3. **SSL/TLSの有効化** - 本番デプロイメント用
4. **ポートの制限** - 本番環境では必要なポートのみ公開
5. **定期的なセキュリティ更新** - ベースイメージの定期更新

## 監視

監視サービスの追加を検討：

```yaml
# docker-compose.ymlに追加
cadvisor:
  image: gcr.io/cadvisor/cadvisor:latest
  ports:
    - '8080:8080'
  volumes:
    - /:/rootfs:ro
    - /var/run:/var/run:ro
    - /sys:/sys:ro
    - /var/lib/docker/:/var/lib/docker:ro
```

---

最終更新：2025年6月23日