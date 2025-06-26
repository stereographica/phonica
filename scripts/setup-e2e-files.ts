#!/usr/bin/env tsx

/**
 * E2Eテストに必要なファイルをセットアップするスクリプト
 * test-audio.wavファイルの生成を含む
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const FIXTURES_DIR = path.join(__dirname, '..', 'e2e', 'fixtures');
const TEST_AUDIO_PATH = path.join(FIXTURES_DIR, 'test-audio.wav');
const UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads');

// シードデータで使用される音声ファイルのリスト
const SEED_AUDIO_FILES = [
  'hot-spring.wav',
  'forest-morning.wav',
  'mountain-stream.wav',
  'shinjuku-station.wav',
  'rainy-street.wav',
  'ocean-waves-dawn.wav',
  'london-underground.wav',
  'tropical-rainforest.wav',
  'cafe-afternoon.wav',
  'arctic-wind.wav',
  'sakura-blizzard.wav',
  'desert-night.wav',
  'kyoto-temple.wav',
  'mumbai-market.wav',
  'thunderstorm.wav',
  'autumn-leaves.wav',
  'nyc-subway.wav',
  'whale-songs.wav',
  'summer-festival.wav',
  'ice-cave.wav',
  'savanna-dawn.wav',
];

/**
 * E2Eテスト用ファイルのセットアップ
 */
function setupE2EFiles() {
  console.log('🔧 Setting up E2E test files...\n');

  // 1. fixturesディレクトリの確認・作成
  if (!fs.existsSync(FIXTURES_DIR)) {
    fs.mkdirSync(FIXTURES_DIR, { recursive: true });
    console.log(`✅ Created fixtures directory: ${FIXTURES_DIR}`);
  }

  // 2. test-audio.wavの生成
  setupTestAudio();

  // 3. GPS付き画像ファイルの確認
  checkGPSPhoto();

  // 4. シードデータ用音声ファイルの生成
  setupSeedAudioFiles();

  console.log('\n✅ E2E test files setup completed!');
}

/**
 * テスト用音声ファイルの生成
 */
function setupTestAudio() {
  console.log('🎵 Checking test audio file...');

  if (fs.existsSync(TEST_AUDIO_PATH)) {
    const stats = fs.statSync(TEST_AUDIO_PATH);
    console.log(`✅ test-audio.wav exists (${stats.size} bytes)`);
    return;
  }

  console.log('⚠️  test-audio.wav not found, generating...');

  // ffmpegを使用して音声ファイルを生成
  try {
    // ffmpegがインストールされているか確認
    execSync('ffmpeg -version', { stdio: 'ignore' });

    // 5秒間の440Hz正弦波を生成（44.1kHz, 16bit, モノラル）
    const command = `ffmpeg -f lavfi -i "sine=frequency=440:duration=5" -ar 44100 -ac 1 -acodec pcm_s16le -y "${TEST_AUDIO_PATH}"`;

    execSync(command, { stdio: 'inherit' });

    // ファイルが生成されたか確認
    if (fs.existsSync(TEST_AUDIO_PATH)) {
      const stats = fs.statSync(TEST_AUDIO_PATH);
      console.log(`✅ Generated test-audio.wav (${stats.size} bytes)`);
      console.log('   Duration: 5 seconds');
      console.log('   Sample rate: 44.1 kHz');
      console.log('   Bit depth: 16 bit');
      console.log('   Channels: 1 (mono)');
      console.log('   Frequency: 440 Hz (A4)');
    } else {
      throw new Error('Failed to generate test audio file');
    }
  } catch {
    console.error('❌ Failed to generate test audio file');
    console.error('   Make sure ffmpeg is installed:');
    console.error('   - macOS: brew install ffmpeg');
    console.error('   - Ubuntu: sudo apt-get install ffmpeg');
    console.error('   - Windows: Download from https://ffmpeg.org/download.html');

    // フォールバック: soxを試す
    try {
      console.log('\n🔄 Trying sox as fallback...');
      execSync('sox -version', { stdio: 'ignore' });

      const soxCommand = `sox -n -r 44100 -b 16 -c 1 "${TEST_AUDIO_PATH}" synth 5 sine 440`;
      execSync(soxCommand, { stdio: 'inherit' });

      if (fs.existsSync(TEST_AUDIO_PATH)) {
        const stats = fs.statSync(TEST_AUDIO_PATH);
        console.log(`✅ Generated test-audio.wav with sox (${stats.size} bytes)`);
      }
    } catch {
      console.error('❌ Sox is also not available');
      console.error('   Please install either ffmpeg or sox to generate test audio files');
      process.exit(1);
    }
  }
}

/**
 * GPS付き画像ファイルの確認
 */
function checkGPSPhoto() {
  console.log('\n📸 Checking GPS photo file...');

  const GPS_PHOTO_PATH = path.join(FIXTURES_DIR, 'photo-with-gps.jpg');

  if (fs.existsSync(GPS_PHOTO_PATH)) {
    const stats = fs.statSync(GPS_PHOTO_PATH);
    console.log(`✅ photo-with-gps.jpg exists (${stats.size} bytes)`);
  } else {
    console.log('⚠️  photo-with-gps.jpg not found');
    console.log('   This file is optional and needed only for location-based tests');
    console.log('   You can add it manually if needed for GPS location tests');
  }
}

/**
 * シードデータ用音声ファイルの生成
 */
function setupSeedAudioFiles() {
  console.log('\n🎵 Setting up seed data audio files...');

  // uploadsディレクトリの作成
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    console.log(`✅ Created uploads directory: ${UPLOADS_DIR}`);
  }

  let generatedCount = 0;
  let skippedCount = 0;

  for (const filename of SEED_AUDIO_FILES) {
    const filePath = path.join(UPLOADS_DIR, filename);

    if (fs.existsSync(filePath)) {
      skippedCount++;
      continue;
    }

    try {
      // ffmpegで5秒間の440Hz正弦波を生成
      const command = `ffmpeg -f lavfi -i "sine=frequency=440:duration=5" -ar 44100 -ac 1 -acodec pcm_s16le -y "${filePath}"`;
      execSync(command, { stdio: 'pipe' });
      generatedCount++;
    } catch {
      console.error(`❌ Failed to generate ${filename}`);
    }
  }

  console.log(`✅ Generated ${generatedCount} audio files`);
  if (skippedCount > 0) {
    console.log(`⏭️  Skipped ${skippedCount} existing files`);
  }

  // ファイルサイズの確認
  console.log('\n📊 Seed audio files:');
  for (const filename of SEED_AUDIO_FILES) {
    const filePath = path.join(UPLOADS_DIR, filename);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      console.log(`  - ${filename}: ${stats.size} bytes`);
    }
  }
}

// メイン処理
if (require.main === module) {
  setupE2EFiles();
}

export { setupE2EFiles };
