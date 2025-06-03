'use server';

import { prisma } from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';

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
        error: 'Missing required fields: title, recordedAt, and file'
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
        error: 'Failed to save file. Please try again.'
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
          })
        )
      : [];

    // 機材IDの検証と接続処理
    let equipmentsToConnect: { id: string }[] = [];
    if (equipmentsStr) {
      const equipmentIds = equipmentsStr.split(',').map(id => id.trim()).filter(id => id);
      
      // 存在する機材IDを検証
      const existingEquipments = await prisma.equipment.findMany({
        where: {
          id: { in: equipmentIds }
        }
      });
      
      // 存在しないIDをチェック
      const existingIds = existingEquipments.map(e => e.id);
      const invalidIds = equipmentIds.filter(id => !existingIds.includes(id));
      
      if (invalidIds.length > 0) {
        return {
          success: false,
          error: `Invalid equipment IDs: ${invalidIds.join(', ')}`
        };
      }
      
      equipmentsToConnect = equipmentIds.map(id => ({ id }));
    }

    // データベースに保存
    const newMaterial = await prisma.material.create({
      data: {
        title,
        slug,
        filePath: filePathForDb,
        recordedAt: new Date(recordedAt),
        memo: (memo === "null" || memo === "") ? null : memo,
        fileFormat: (fileFormat === "null" || fileFormat === "") ? null : fileFormat,
        sampleRate: sampleRateStr ? (isNaN(parseInt(sampleRateStr)) ? null : parseInt(sampleRateStr)) : null,
        bitDepth: bitDepthStr ? (isNaN(parseInt(bitDepthStr)) ? null : parseInt(bitDepthStr)) : null,
        latitude: latitudeStr ? (isNaN(parseFloat(latitudeStr)) ? null : parseFloat(latitudeStr)) : null,
        longitude: longitudeStr ? (isNaN(parseFloat(longitudeStr)) ? null : parseFloat(longitudeStr)) : null,
        locationName: (locationName === "null" || locationName === "") ? null : locationName,
        rating: ratingStr ? (isNaN(parseInt(ratingStr)) ? null : parseInt(ratingStr)) : null,
        tags: { connectOrCreate: tagsToConnect },
        equipments: { 
          connect: equipmentsToConnect 
        },
      },
      include: { tags: true, equipments: true },
    });

    return {
      success: true,
      data: newMaterial
    };
  } catch (error) {
    console.error('Error creating material:', error);
    
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002' && 
        'meta' in error && error.meta && typeof error.meta === 'object' && 'target' in error.meta &&
        Array.isArray(error.meta.target) && error.meta.target.includes('slug')) {
      return {
        success: false,
        error: 'Failed to create material: Slug already exists. Please change the title.'
      };
    }
    
    return {
      success: false,
      error: 'Failed to create material'
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
        error: 'Missing required fields: title and recordedAt'
      };
    }

    // 既存の素材を取得
    const existingMaterial = await prisma.material.findUnique({
      where: { slug },
      include: { tags: true, equipments: true }
    });

    if (!existingMaterial) {
      return {
        success: false,
        error: 'Material not found'
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
          error: 'Failed to save file. Please try again.'
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
          })
        )
      : [];

    // 機材IDの検証と接続処理
    let equipmentsToConnect: { id: string }[] = [];
    if (equipmentsStr) {
      const equipmentIds = equipmentsStr.split(',').map(id => id.trim()).filter(id => id);
      
      // 存在する機材IDを検証
      const existingEquipments = await prisma.equipment.findMany({
        where: {
          id: { in: equipmentIds }
        }
      });
      
      // 存在しないIDをチェック
      const existingIds = existingEquipments.map(e => e.id);
      const invalidIds = equipmentIds.filter(id => !existingIds.includes(id));
      
      if (invalidIds.length > 0) {
        return {
          success: false,
          error: `Invalid equipment IDs: ${invalidIds.join(', ')}`
        };
      }
      
      equipmentsToConnect = equipmentIds.map(id => ({ id }));
    }

    // データベースを更新
    const updatedMaterial = await prisma.material.update({
      where: { slug },
      data: {
        title,
        filePath: filePathForDb,
        recordedAt: new Date(recordedAt),
        memo: (memo === "null" || memo === "") ? null : memo,
        fileFormat: (fileFormat === "null" || fileFormat === "") ? null : fileFormat,
        sampleRate: sampleRateStr ? (isNaN(parseInt(sampleRateStr)) ? null : parseInt(sampleRateStr)) : null,
        bitDepth: bitDepthStr ? (isNaN(parseInt(bitDepthStr)) ? null : parseInt(bitDepthStr)) : null,
        latitude: latitudeStr ? (isNaN(parseFloat(latitudeStr)) ? null : parseFloat(latitudeStr)) : null,
        longitude: longitudeStr ? (isNaN(parseFloat(longitudeStr)) ? null : parseFloat(longitudeStr)) : null,
        locationName: (locationName === "null" || locationName === "") ? null : locationName,
        rating: ratingStr ? (isNaN(parseInt(ratingStr)) ? null : parseInt(ratingStr)) : null,
        tags: {
          set: [], // 既存のタグをクリア
          connectOrCreate: tagsToConnect
        },
        equipments: { 
          set: equipmentsToConnect // 既存の機材をクリアして新しいものを設定
        },
      },
      include: { tags: true, equipments: true },
    });

    return {
      success: true,
      data: updatedMaterial
    };
  } catch (error) {
    console.error('Error updating material:', error);
    
    return {
      success: false,
      error: 'Failed to update material'
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