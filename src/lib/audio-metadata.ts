import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { randomUUID } from 'crypto';

interface NodeError extends Error {
  code?: string;
  path?: string;
}

export interface AudioMetadata {
  fileFormat: string;
  sampleRate: number;
  bitDepth: number | null;
  durationSeconds: number;
  channels: number;
}

interface FFProbeStream {
  codec_type?: string;
  codec_name?: string;
  sample_rate?: string;
  channels?: number;
  bits_per_sample?: number;
}

interface FFProbeFormat {
  format_name?: string;
  duration?: string;
}

interface FFProbeOutput {
  streams?: FFProbeStream[];
  format?: FFProbeFormat;
}

export class TempFileNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TempFileNotFoundError';
  }
}

export class AudioMetadataService {
  private readonly TEMP_DIR = process.env.TEMP_UPLOAD_DIR || '/tmp/phonica-uploads';
  private readonly UPLOAD_DIR =
    process.env.UPLOAD_DIR || path.join(process.cwd(), 'public/uploads/materials');
  private readonly ANALYSIS_TIMEOUT = 30000; // 30秒
  private readonly FILE_TTL = 60 * 60 * 1000; // 1時間

  /**
   * 音声ファイルからメタデータを抽出
   * ffprobeが利用できない場合はnullを返す
   */
  async extractMetadata(filePath: string): Promise<AudioMetadata | null> {
    try {
      return await this.executeFFProbe(filePath);
    } catch (error) {
      console.warn(`Failed to extract metadata from ${filePath}:`, error);
      return null;
    }
  }

  /**
   * 一時ファイルを保存
   */
  async saveTempFile(file: File): Promise<string> {
    const tempFileId = randomUUID();
    const tempPath = path.join(this.TEMP_DIR, `${tempFileId}_${file.name}`);

    await fs.mkdir(this.TEMP_DIR, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(tempPath, buffer);

    return tempFileId;
  }

  /**
   * 音声ファイルを解析（非同期）
   */
  async analyzeAudio(tempFileId: string): Promise<AudioMetadata> {
    try {
      const tempFiles = await fs.readdir(this.TEMP_DIR);
      const tempFile = tempFiles.find((f) => f.startsWith(tempFileId));

      if (!tempFile) {
        throw new Error('Temporary file not found');
      }

      const filePath = path.join(this.TEMP_DIR, tempFile);
      const metadata = await this.extractMetadata(filePath);

      if (!metadata) {
        throw new Error('Failed to extract metadata');
      }

      return metadata;
    } catch (error) {
      // ディレクトリが存在しない場合も「一時ファイルが見つからない」エラーとして扱う
      const nodeError = error as NodeError;
      if (nodeError.code === 'ENOENT') {
        throw new Error('Temporary file not found');
      }
      throw error;
    }
  }

  /**
   * 一時ファイルを永続化
   */
  async persistTempFile(tempFileId: string, permanentFileName: string): Promise<string> {
    try {
      const tempFiles = await fs.readdir(this.TEMP_DIR);
      const tempFile = tempFiles.find((f) => f.startsWith(tempFileId));

      if (!tempFile) {
        throw new TempFileNotFoundError(
          'アップロードされたファイルが見つかりません。再度アップロードしてください。',
        );
      }

      const tempPath = path.join(this.TEMP_DIR, tempFile);
      const permanentPath = path.join(this.UPLOAD_DIR, permanentFileName);

      // アップロードディレクトリが存在することを確認
      await fs.mkdir(this.UPLOAD_DIR, { recursive: true });

      await fs.rename(tempPath, permanentPath);
      return permanentPath;
    } catch (error) {
      // ディレクトリが存在しない場合も「一時ファイルが見つからない」エラーとして扱う
      const nodeError = error as NodeError;
      if (nodeError.code === 'ENOENT' && nodeError.path === this.TEMP_DIR) {
        throw new TempFileNotFoundError(
          'アップロードされたファイルが見つかりません。再度アップロードしてください。',
        );
      }
      throw error;
    }
  }

  /**
   * 一時ファイルの存在確認
   */
  async verifyTempFile(tempFileId: string): Promise<boolean> {
    try {
      const files = await fs.readdir(this.TEMP_DIR);
      return files.some((f) => f.startsWith(tempFileId));
    } catch {
      return false;
    }
  }

  /**
   * 一時ファイルをクリーンアップ（定期実行）
   */
  async cleanupTempFiles(): Promise<void> {
    try {
      const files = await fs.readdir(this.TEMP_DIR);

      for (const file of files) {
        const filePath = path.join(this.TEMP_DIR, file);
        const stats = await fs.stat(filePath);

        if (Date.now() - stats.mtimeMs > this.FILE_TTL) {
          await fs.unlink(filePath);
          console.log(`🗑️ Deleted expired file: ${file}`);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup temp files:', error);
    }
  }

  private async executeFFProbe(filePath: string): Promise<AudioMetadata> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('FFProbe timeout'));
      }, this.ANALYSIS_TIMEOUT);

      exec(
        `ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`,
        (error, stdout) => {
          clearTimeout(timeout);

          if (error) {
            reject(error);
            return;
          }

          try {
            const data = JSON.parse(stdout) as FFProbeOutput;
            const audioStream = data.streams?.find((s) => s.codec_type === 'audio');

            if (!audioStream || !data.format) {
              reject(new Error('No audio stream found'));
              return;
            }

            resolve({
              fileFormat: this.normalizeFileFormat(data.format.format_name || ''),
              sampleRate: parseInt(audioStream.sample_rate || '0'),
              bitDepth: this.detectBitDepth(audioStream),
              durationSeconds: parseFloat(data.format.duration || '0'),
              channels: audioStream.channels || 0,
            });
          } catch (parseError) {
            reject(parseError);
          }
        },
      );
    });
  }

  private normalizeFileFormat(formatName: string): string {
    const formatMap: Record<string, string> = {
      wav: 'WAV',
      mp3: 'MP3',
      aiff: 'AIFF',
      flac: 'FLAC',
      ogg: 'OGG',
      m4a: 'M4A',
      aac: 'AAC',
      opus: 'OPUS',
      wma: 'WMA',
      alac: 'ALAC',
    };

    return formatMap[formatName.toLowerCase()] || 'UNKNOWN';
  }

  private detectBitDepth(stream: FFProbeStream): number | null {
    // 直接bits_per_sampleが設定されている場合
    if (stream.bits_per_sample) {
      return stream.bits_per_sample;
    }

    // codec_nameから推測
    const codecName = stream.codec_name?.toLowerCase() || '';

    if (codecName.includes('pcm_s16')) return 16;
    if (codecName.includes('pcm_s24')) return 24;
    if (codecName.includes('pcm_s32')) return 32;
    if (codecName.includes('pcm_f32')) return 32;
    if (codecName.includes('pcm_f64')) return 64;

    // MP3などの圧縮形式はビット深度の概念がない
    return null;
  }
}
