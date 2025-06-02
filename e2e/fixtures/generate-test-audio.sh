#!/bin/bash

# E2Eテスト用の音声ファイルを生成するスクリプト
# 5秒間の440Hz正弦波、44.1kHz/16bit

# スクリプトのディレクトリを取得
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
OUTPUT_FILE="$SCRIPT_DIR/test-audio.wav"

echo "🎵 Generating test audio file..."

# soxコマンドが利用可能か確認
if ! command -v sox &> /dev/null; then
    echo "❌ Error: sox command not found. Please install sox first."
    echo "   On macOS: brew install sox"
    echo "   On Ubuntu: sudo apt-get install sox"
    exit 1
fi

# 既存のファイルがある場合は削除
if [ -f "$OUTPUT_FILE" ]; then
    rm "$OUTPUT_FILE"
fi

# 5秒間の440Hz正弦波を生成（44.1kHz, 16bit, モノラル）
sox -n -r 44100 -b 16 -c 1 "$OUTPUT_FILE" synth 5 sine 440

if [ $? -eq 0 ]; then
    echo "✅ Test audio file generated successfully: $OUTPUT_FILE"
    echo "   Duration: 5 seconds"
    echo "   Sample rate: 44.1 kHz"
    echo "   Bit depth: 16 bit"
    echo "   Channels: 1 (mono)"
    echo "   Frequency: 440 Hz (A4)"
    
    # ファイルサイズを表示
    if [ -f "$OUTPUT_FILE" ]; then
        SIZE=$(ls -lh "$OUTPUT_FILE" | awk '{print $5}')
        echo "   File size: $SIZE"
    fi
else
    echo "❌ Error: Failed to generate test audio file"
    exit 1
fi