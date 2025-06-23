'use server';

import { prisma } from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import { AudioMetadataService } from '@/lib/audio-metadata';
import { generateUniqueSlug } from '@/lib/slug-generator';
import { ERROR_MESSAGES } from '@/lib/error-messages';

// Audio metadata type
interface AudioMetadata {
  fileFormat: string;
  sampleRate: number;
  bitDepth: number | null;
  durationSeconds: number;
  channels: number;
}

// slugify関数
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

/**
 * 素材データを取得
 */
export async function getMaterial(slug: string) {
  try {
    const material = await prisma.material.findUnique({
      where: { slug },
      include: {
        tags: true,
        equipments: true,
      },
    });

    if (!material) {
      return {
        success: false,
        error: 'Material not found',
      };
    }

    // APIレスポンスと同じ形式に変換
    const formattedMaterial = {
      id: material.id,
      slug: material.slug,
      title: material.title,
      recordedDate: material.recordedAt.toISOString(),
      memo: material.memo,
      tags: material.tags.map((t) => ({ name: t.name })),
      equipments: material.equipments.map((e) => ({ id: e.id, name: e.name })),
      filePath: material.filePath,
      fileFormat: material.fileFormat,
      sampleRate: material.sampleRate,
      bitDepth: material.bitDepth,
      durationSeconds: material.durationSeconds,
      channels: material.channels,
      latitude: material.latitude,
      longitude: material.longitude,
      locationName: material.locationName,
      rating: material.rating,
    };

    return {
      success: true,
      data: formattedMaterial,
    };
  } catch (error) {
    console.error('Error fetching material:', error);
    return {
      success: false,
      error: 'Failed to fetch material',
    };
  }
}

/**
 * 音声ファイルをアップロードしてメタデータを抽出
 */
export async function uploadAndAnalyzeAudio(formData: FormData) {
  try {
    const file = formData.get('file') as File;

    if (!file) {
      return {
        success: false,
        error: 'No file provided',
      };
    }

    // AudioMetadataServiceを使用
    const audioMetadataService = new AudioMetadataService();

    // 一時ファイルとして保存
    const tempFileId = await audioMetadataService.saveTempFile(file);

    // メタデータを抽出
    try {
      const metadata = await audioMetadataService.analyzeAudio(tempFileId);

      return {
        success: true,
        tempFileId,
        fileName: file.name,
        metadata,
      };
    } catch (error) {
      console.error('Failed to extract metadata:', error);
      return {
        success: false,
        error: 'Failed to analyze audio file',
      };
    }
  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: 'Failed to upload file',
    };
  }
}

/**
 * メタデータ抽出対応の新しい素材作成関数
 */
export async function createMaterialWithMetadata(data: {
  title: string;
  tempFileId: string;
  fileName: string;
  recordedAt: string;
  memo?: string | null;
  tags?: string[];
  equipmentIds?: string[];
  latitude?: number | null;
  longitude?: number | null;
  locationName?: string | null;
  rating?: number | null;
  metadata: AudioMetadata;
}) {
  try {
    // AudioMetadataServiceを使用
    const audioMetadataService = new AudioMetadataService();

    // 一時ファイルの確認
    const tempFileExists = await audioMetadataService.verifyTempFile(data.tempFileId);
    if (!tempFileExists) {
      return {
        success: false,
        error: 'Temporary file not found',
      };
    }

    // ファイル名の生成
    const uniqueFileName = `${uuidv4()}_${data.fileName}`;

    // 一時ファイルを永続化
    let filePath: string;
    try {
      filePath = await audioMetadataService.persistTempFile(data.tempFileId, uniqueFileName);
    } catch (error) {
      console.error('Failed to persist temp file:', error);
      return {
        success: false,
        error: 'Failed to persist file',
      };
    }

    // データベース用のファイルパス
    const filePathForDb = filePath.replace(process.cwd() + '/public', '');

    // ユニークなslugを生成
    const slug = await generateUniqueSlug(data.title, 'material');

    // タグの処理
    const tagsToConnect = data.tags
      ? await Promise.all(
          data.tags.map(async (tagName) => {
            const trimmedName = tagName.trim();
            const tagSlug = await generateUniqueSlug(trimmedName, 'tag');
            return {
              where: { name: trimmedName },
              create: { name: trimmedName, slug: tagSlug },
            };
          }),
        )
      : [];

    // 機材IDの検証と接続処理
    let equipmentsToConnect: { id: string }[] = [];
    if (data.equipmentIds && data.equipmentIds.length > 0) {
      // 存在する機材IDを検証
      const existingEquipments = await prisma.equipment.findMany({
        where: {
          id: { in: data.equipmentIds },
        },
      });

      // 存在しないIDをチェック
      const existingIds = existingEquipments.map((e) => e.id);
      const invalidIds = data.equipmentIds.filter((id) => !existingIds.includes(id));

      if (invalidIds.length > 0) {
        return {
          success: false,
          error: `Invalid equipment IDs: ${invalidIds.join(', ')}`,
        };
      }

      equipmentsToConnect = data.equipmentIds.map((id) => ({ id }));
    }

    // 素材を作成
    const newMaterial = await prisma.material.create({
      data: {
        title: data.title,
        slug,
        filePath: filePathForDb,
        recordedAt: new Date(data.recordedAt),
        memo: data.memo,
        fileFormat: data.metadata.fileFormat,
        sampleRate: data.metadata.sampleRate,
        bitDepth: data.metadata.bitDepth,
        durationSeconds: data.metadata.durationSeconds,
        channels: data.metadata.channels,
        latitude: data.latitude,
        longitude: data.longitude,
        locationName: data.locationName,
        rating: data.rating,
        tags: { connectOrCreate: tagsToConnect },
        equipments: {
          connect: equipmentsToConnect,
        },
      },
      include: { tags: true, equipments: true },
    });

    return {
      success: true,
      data: newMaterial,
    };
  } catch (error: unknown) {
    console.error('Error creating material:', error);

    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'P2002' &&
      'meta' in error &&
      error.meta &&
      typeof error.meta === 'object' &&
      'target' in error.meta &&
      Array.isArray(error.meta.target)
    ) {
      if (error.meta.target.includes('title')) {
        return {
          success: false,
          error: ERROR_MESSAGES.MATERIAL_TITLE_EXISTS,
        };
      } else if (error.meta.target.includes('slug')) {
        return {
          success: false,
          error: 'Slugの生成に失敗しました。もう一度お試しください。',
        };
      }
    }

    return {
      success: false,
      error: ERROR_MESSAGES.DATABASE_ERROR,
    };
  }
}

export async function createMaterial(formData: FormData) {
  try {
    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string | null;
    const recordedAt = formData.get('recordedAt') as string | null;
    const memo = formData.get('memo') as string | null;
    const tagsStr = formData.get('tags') as string | null;
    const fileFormat = formData.get('fileFormat') as string | null;
    const sampleRateStr = formData.get('sampleRate') as string | null;
    const bitDepthStr = formData.get('bitDepth') as string | null;
    const latitudeStr = formData.get('latitude') as string | null;
    const longitudeStr = formData.get('longitude') as string | null;
    const locationName = formData.get('locationName') as string | null;
    const ratingStr = formData.get('rating') as string | null;
    const equipmentsStr = formData.get('equipmentIds') as string | null;

    if (!title || !recordedAt || !file) {
      return {
        success: false,
        error: 'Missing required fields: title, recordedAt, and file',
      };
    }

    // ファイルの保存
    const fileExtension = path.extname(file.name);
    const fileNamePrefix = process.env.NODE_ENV === 'test' ? 'test-dummy-' : '';
    const uniqueFileName = `${fileNamePrefix}${uuidv4()}${fileExtension}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'materials');
    const filePathInFilesystem = path.join(uploadDir, uniqueFileName);
    const filePathForDb = `/uploads/materials/${uniqueFileName}`;

    try {
      await fs.mkdir(uploadDir, { recursive: true });
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(filePathInFilesystem, fileBuffer);
    } catch (fileError) {
      console.error('Error saving file:', fileError);
      return {
        success: false,
        error: 'Failed to save file. Please try again.',
      };
    }

    // タイムスタンプを追加してslugをユニークにする
    const timestamp = Date.now();
    const slug = `${slugify(title)}-${timestamp}`;

    // タグの処理
    const tagsToConnect = tagsStr
      ? await Promise.all(
          tagsStr.split(',').map(async (tagName) => {
            const trimmedName = tagName.trim();
            return {
              where: { name: trimmedName },
              create: { name: trimmedName, slug: slugify(trimmedName) },
            };
          }),
        )
      : [];

    // 機材IDの検証と接続処理
    let equipmentsToConnect: { id: string }[] = [];
    if (equipmentsStr) {
      const equipmentIds = equipmentsStr
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id);

      // 存在する機材IDを検証
      const existingEquipments = await prisma.equipment.findMany({
        where: {
          id: { in: equipmentIds },
        },
      });

      // 存在しないIDをチェック
      const existingIds = existingEquipments.map((e) => e.id);
      const invalidIds = equipmentIds.filter((id) => !existingIds.includes(id));

      if (invalidIds.length > 0) {
        return {
          success: false,
          error: `Invalid equipment IDs: ${invalidIds.join(', ')}`,
        };
      }

      equipmentsToConnect = equipmentIds.map((id) => ({ id }));
    }

    // データベースに保存
    const newMaterial = await prisma.material.create({
      data: {
        title,
        slug,
        filePath: filePathForDb,
        recordedAt: new Date(recordedAt),
        memo: memo === 'null' || memo === '' ? null : memo,
        fileFormat: fileFormat === 'null' || fileFormat === '' ? null : fileFormat,
        sampleRate: sampleRateStr
          ? isNaN(parseInt(sampleRateStr))
            ? null
            : parseInt(sampleRateStr)
          : null,
        bitDepth: bitDepthStr
          ? isNaN(parseInt(bitDepthStr))
            ? null
            : parseInt(bitDepthStr)
          : null,
        latitude: latitudeStr
          ? isNaN(parseFloat(latitudeStr))
            ? null
            : parseFloat(latitudeStr)
          : null,
        longitude: longitudeStr
          ? isNaN(parseFloat(longitudeStr))
            ? null
            : parseFloat(longitudeStr)
          : null,
        locationName: locationName === 'null' || locationName === '' ? null : locationName,
        rating: ratingStr ? (isNaN(parseInt(ratingStr)) ? null : parseInt(ratingStr)) : null,
        tags: { connectOrCreate: tagsToConnect },
        equipments: {
          connect: equipmentsToConnect,
        },
      },
      include: { tags: true, equipments: true },
    });

    return {
      success: true,
      data: newMaterial,
    };
  } catch (error) {
    console.error('Error creating material:', error);

    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'P2002' &&
      'meta' in error &&
      error.meta &&
      typeof error.meta === 'object' &&
      'target' in error.meta &&
      Array.isArray(error.meta.target) &&
      error.meta.target.includes('slug')
    ) {
      return {
        success: false,
        error: 'Failed to create material: Slug already exists. Please change the title.',
      };
    }

    return {
      success: false,
      error: 'Failed to create material',
    };
  }
}

/**
 * メタデータ抽出対応の新しい素材更新関数
 */
export async function updateMaterialWithMetadata(
  slug: string,
  data: {
    title: string;
    recordedAt: string;
    memo?: string | null;
    tags?: string[];
    equipmentIds?: string[];
    latitude?: number | null;
    longitude?: number | null;
    locationName?: string | null;
    rating?: number | null;
    // 新しいファイルがアップロードされた場合
    tempFileId?: string;
    fileName?: string;
    metadata?: AudioMetadata;
  },
) {
  try {
    // 既存の素材を取得
    const existingMaterial = await prisma.material.findUnique({
      where: { slug },
      include: { tags: true, equipments: true },
    });

    if (!existingMaterial) {
      return {
        success: false,
        error: 'Material not found',
      };
    }

    let filePathForDb = existingMaterial.filePath;
    let fileFormat = existingMaterial.fileFormat;
    let sampleRate = existingMaterial.sampleRate;
    let bitDepth = existingMaterial.bitDepth;
    let durationSeconds = existingMaterial.durationSeconds;
    let channels = existingMaterial.channels;

    // 新しいファイルがアップロードされた場合
    if (data.tempFileId && data.fileName && data.metadata) {
      const audioMetadataService = new AudioMetadataService();

      // 一時ファイルの確認
      const tempFileExists = await audioMetadataService.verifyTempFile(data.tempFileId);
      if (!tempFileExists) {
        return {
          success: false,
          error: 'Temporary file not found',
        };
      }

      // ファイル名の生成
      const uniqueFileName = `${uuidv4()}_${data.fileName}`;

      // 一時ファイルを永続化
      let filePath: string;
      try {
        filePath = await audioMetadataService.persistTempFile(data.tempFileId, uniqueFileName);
      } catch (error) {
        console.error('Failed to persist temp file:', error);
        return {
          success: false,
          error: 'Failed to persist file',
        };
      }

      // データベース用のファイルパス
      filePathForDb = filePath.replace(process.cwd() + '/public', '');

      // 新しいメタデータを使用
      fileFormat = data.metadata.fileFormat;
      sampleRate = data.metadata.sampleRate;
      bitDepth = data.metadata.bitDepth;
      durationSeconds = data.metadata.durationSeconds;
      channels = data.metadata.channels;

      // TODO: 古いファイルを削除キューに追加
    }

    // タグの処理
    const tagsToConnect = data.tags
      ? await Promise.all(
          data.tags.map(async (tagName) => {
            const trimmedName = tagName.trim();
            const tagSlug = await generateUniqueSlug(trimmedName, 'tag');
            return {
              where: { name: trimmedName },
              create: { name: trimmedName, slug: tagSlug },
            };
          }),
        )
      : [];

    // 機材IDの検証と接続処理
    let equipmentsToConnect: { id: string }[] = [];
    if (data.equipmentIds && data.equipmentIds.length > 0) {
      // 存在する機材IDを検証
      const existingEquipments = await prisma.equipment.findMany({
        where: {
          id: { in: data.equipmentIds },
        },
      });

      // 存在しないIDをチェック
      const existingIds = existingEquipments.map((e) => e.id);
      const invalidIds = data.equipmentIds.filter((id) => !existingIds.includes(id));

      if (invalidIds.length > 0) {
        return {
          success: false,
          error: `Invalid equipment IDs: ${invalidIds.join(', ')}`,
        };
      }

      equipmentsToConnect = data.equipmentIds.map((id) => ({ id }));
    }

    // データベースを更新
    const updatedMaterial = await prisma.material.update({
      where: { slug },
      data: {
        title: data.title,
        filePath: filePathForDb,
        recordedAt: new Date(data.recordedAt),
        memo: data.memo,
        fileFormat,
        sampleRate,
        bitDepth,
        durationSeconds,
        channels,
        latitude: data.latitude,
        longitude: data.longitude,
        locationName: data.locationName,
        rating: data.rating,
        tags: {
          set: [], // 既存のタグをクリア
          connectOrCreate: tagsToConnect,
        },
        equipments: {
          set: equipmentsToConnect, // 既存の機材をクリアして新しいものを設定
        },
      },
      include: { tags: true, equipments: true },
    });

    return {
      success: true,
      data: updatedMaterial,
    };
  } catch (error: unknown) {
    console.error('Error updating material:', error);

    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'P2002' &&
      'meta' in error &&
      error.meta &&
      typeof error.meta === 'object' &&
      'target' in error.meta &&
      Array.isArray(error.meta.target)
    ) {
      if (error.meta.target.includes('title')) {
        return {
          success: false,
          error: ERROR_MESSAGES.MATERIAL_TITLE_EXISTS,
        };
      }
    }

    return {
      success: false,
      error: ERROR_MESSAGES.DATABASE_ERROR,
    };
  }
}

export async function updateMaterial(slug: string, formData: FormData) {
  try {
    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string | null;
    const recordedAt = formData.get('recordedAt') as string | null;
    const memo = formData.get('memo') as string | null;
    const tagsStr = formData.get('tags') as string | null;
    const fileFormat = formData.get('fileFormat') as string | null;
    const sampleRateStr = formData.get('sampleRate') as string | null;
    const bitDepthStr = formData.get('bitDepth') as string | null;
    const latitudeStr = formData.get('latitude') as string | null;
    const longitudeStr = formData.get('longitude') as string | null;
    const locationName = formData.get('locationName') as string | null;
    const ratingStr = formData.get('rating') as string | null;
    const equipmentsStr = formData.get('equipmentIds') as string | null;

    if (!title || !recordedAt) {
      return {
        success: false,
        error: 'Missing required fields: title and recordedAt',
      };
    }

    // 既存の素材を取得
    const existingMaterial = await prisma.material.findUnique({
      where: { slug },
      include: { tags: true, equipments: true },
    });

    if (!existingMaterial) {
      return {
        success: false,
        error: 'Material not found',
      };
    }

    let filePathForDb = existingMaterial.filePath;

    // 新しいファイルがアップロードされた場合
    if (file && file.size > 0) {
      const fileExtension = path.extname(file.name);
      const fileNamePrefix = process.env.NODE_ENV === 'test' ? 'test-dummy-' : '';
      const uniqueFileName = `${fileNamePrefix}${uuidv4()}${fileExtension}`;
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'materials');
      const filePathInFilesystem = path.join(uploadDir, uniqueFileName);

      try {
        await fs.mkdir(uploadDir, { recursive: true });
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        await fs.writeFile(filePathInFilesystem, fileBuffer);
        filePathForDb = `/uploads/materials/${uniqueFileName}`;
      } catch (fileError) {
        console.error('Error saving file:', fileError);
        return {
          success: false,
          error: 'Failed to save file. Please try again.',
        };
      }

      // 古いファイルを削除キューに追加（実装済みの場合）
      // TODO: ファイル削除キューの処理
    }

    // タグの処理
    const tagsToConnect = tagsStr
      ? await Promise.all(
          tagsStr.split(',').map(async (tagName) => {
            const trimmedName = tagName.trim();
            return {
              where: { name: trimmedName },
              create: { name: trimmedName, slug: slugify(trimmedName) },
            };
          }),
        )
      : [];

    // 機材IDの検証と接続処理
    let equipmentsToConnect: { id: string }[] = [];
    if (equipmentsStr) {
      const equipmentIds = equipmentsStr
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id);

      // 存在する機材IDを検証
      const existingEquipments = await prisma.equipment.findMany({
        where: {
          id: { in: equipmentIds },
        },
      });

      // 存在しないIDをチェック
      const existingIds = existingEquipments.map((e) => e.id);
      const invalidIds = equipmentIds.filter((id) => !existingIds.includes(id));

      if (invalidIds.length > 0) {
        return {
          success: false,
          error: `Invalid equipment IDs: ${invalidIds.join(', ')}`,
        };
      }

      equipmentsToConnect = equipmentIds.map((id) => ({ id }));
    }

    // データベースを更新
    const updatedMaterial = await prisma.material.update({
      where: { slug },
      data: {
        title,
        filePath: filePathForDb,
        recordedAt: new Date(recordedAt),
        memo: memo === 'null' || memo === '' ? null : memo,
        fileFormat: fileFormat === 'null' || fileFormat === '' ? null : fileFormat,
        sampleRate: sampleRateStr
          ? isNaN(parseInt(sampleRateStr))
            ? null
            : parseInt(sampleRateStr)
          : null,
        bitDepth: bitDepthStr
          ? isNaN(parseInt(bitDepthStr))
            ? null
            : parseInt(bitDepthStr)
          : null,
        latitude: latitudeStr
          ? isNaN(parseFloat(latitudeStr))
            ? null
            : parseFloat(latitudeStr)
          : null,
        longitude: longitudeStr
          ? isNaN(parseFloat(longitudeStr))
            ? null
            : parseFloat(longitudeStr)
          : null,
        locationName: locationName === 'null' || locationName === '' ? null : locationName,
        rating: ratingStr ? (isNaN(parseInt(ratingStr)) ? null : parseInt(ratingStr)) : null,
        tags: {
          set: [], // 既存のタグをクリア
          connectOrCreate: tagsToConnect,
        },
        equipments: {
          set: equipmentsToConnect, // 既存の機材をクリアして新しいものを設定
        },
      },
      include: { tags: true, equipments: true },
    });

    return {
      success: true,
      data: updatedMaterial,
    };
  } catch (error) {
    console.error('Error updating material:', error);

    return {
      success: false,
      error: 'Failed to update material',
    };
  }
}

// E2Eテスト専用のヘルパー関数
export async function createMaterialForTest(data: {
  title: string;
  testFileName: string;
  testFileContent: string;
  recordedAt: string;
  memo?: string;
  tags?: string;
  fileFormat?: string;
  sampleRate?: string;
  bitDepth?: string;
  latitude?: string;
  longitude?: string;
  locationName?: string;
  rating?: string;
  equipmentIds?: string;
}) {
  // テスト環境でのみ実行可能
  if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'development') {
    throw new Error('This function is only available in test/development environment');
  }

  // ダミーファイルを作成
  const blob = new Blob([data.testFileContent], { type: 'audio/wav' });
  const file = new File([blob], data.testFileName, { type: 'audio/wav' });

  // FormDataを作成
  const formData = new FormData();
  formData.append('file', file);
  formData.append('title', data.title);
  formData.append('recordedAt', data.recordedAt);
  if (data.memo) formData.append('memo', data.memo);
  if (data.tags) formData.append('tags', data.tags);
  if (data.fileFormat) formData.append('fileFormat', data.fileFormat);
  if (data.sampleRate) formData.append('sampleRate', data.sampleRate);
  if (data.bitDepth) formData.append('bitDepth', data.bitDepth);
  if (data.latitude) formData.append('latitude', data.latitude);
  if (data.longitude) formData.append('longitude', data.longitude);
  if (data.locationName) formData.append('locationName', data.locationName);
  if (data.rating) formData.append('rating', data.rating);
  if (data.equipmentIds) formData.append('equipmentIds', data.equipmentIds);

  // 通常のcreateMateria関数を使用
  return createMaterial(formData);
}
