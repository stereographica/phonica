import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import type { Prisma } from '@prisma/client'; // 型定義のみインポート
import { v4 as uuidv4 } from 'uuid'; // 追加
import path from 'path'; // 追加
import {
  deleteFile,
  markFileForDeletion,
  unmarkFileForDeletion,
  checkFileExists,
  FileSystemError,
} from '@/lib/file-system';
import fs from 'fs/promises'; // fs を再度インポート
import { AudioMetadataService } from '@/lib/audio-metadata'; // 追加
import { ERROR_MESSAGES } from '@/lib/error-messages';
// import type { Prisma } from '@prisma/client'; // Prisma Namespaceはここでは不要かも

const routeParamsSchema = z.object({
  slug: z.string().trim().min(1, { message: 'Material slug cannot be empty.' }),
});

// Next.js 15.3.3 の新しい型定義
type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const paramsObject = await context.params;
    // const receivedSlug = paramsObject.slug;
    // console.log('[GET /api/materials/[slug]] Received slug for processing:', receivedSlug);
    // console.log('[GET /api/materials/[slug]] Full params for validation:', JSON.stringify(paramsObject));

    const validatedParams = routeParamsSchema.safeParse(paramsObject);
    if (!validatedParams.success) {
      console.error(
        '[GET /api/materials/[slug]] Validation failed:',
        validatedParams.error.flatten(),
      );
      return NextResponse.json(
        { error: 'Invalid material slug', details: validatedParams.error.flatten() },
        { status: 400 },
      );
    }

    const { slug } = validatedParams.data;

    const material = await prisma.material.findUnique({
      where: { slug },
      include: {
        // category: true, // Categoryリレーションはスキーマにないため削除
        tags: true, // MaterialTagsリレーションを経由してTagモデルの配列を取得
        equipments: true, // MaterialEquipmentsリレーションを経由してEquipmentモデルの配列を取得
      },
    });

    if (!material) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 });
    }

    // APIレスポンスの形式を整形
    const responseData = {
      id: material.id,
      slug: material.slug,
      title: material.title,
      memo: material.memo, // フロントエンド側でmemoを期待しているため
      recordedDate: material.recordedAt.toISOString(),
      categoryName: null, // スキーマにCategoryがないためnull
      tags: material.tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
      })),
      filePath: material.filePath,
      fileFormat: material.fileFormat, // スキーマに合わせて追加
      // fileSize: material.fileSize, // スキーマにないのでコメントアウト (必要なら追加)
      durationSeconds: material.durationSeconds,
      sampleRate: material.sampleRate,
      bitDepth: material.bitDepth,
      channels: material.channels,
      latitude: material.latitude,
      longitude: material.longitude,
      locationName: material.locationName, // スキーマに合わせて追加
      rating: material.rating,
      equipments: material.equipments.map((equipment) => ({
        id: equipment.id,
        name: equipment.name,
        type: equipment.type,
        manufacturer: equipment.manufacturer, // スキーマに合わせて追加
      })),
      createdAt: material.createdAt.toISOString(), // 追加 (任意)
      updatedAt: material.updatedAt.toISOString(), // 追加 (任意)
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Failed to fetch material:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: error.flatten() },
        { status: 400 },
      );
    }
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

// PUTリクエストのボディのスキーマ定義
const updateMaterialSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  recordedAt: z
    .string()
    .datetime({ message: 'Invalid datetime string. Must be UTC ISO8601.' })
    .optional(),
  memo: z.string().nullable().optional(),
  tags: z.array(z.string().min(1)).optional(), // タグ名の配列
  equipmentIds: z.array(z.string().min(1)).optional(), // 機材IDの配列
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  locationName: z.string().nullable().optional(),
  rating: z.number().int().min(0).max(5).nullable().optional(),
  // 新しいファイルアップロード対応
  tempFileId: z.string().optional(),
  fileName: z.string().optional(),
  replaceFile: z.boolean().optional(),
});

export async function PUT(request: NextRequest, context: RouteContext) {
  let oldFilePath: string | null = null;
  let newFilePathForCleanup: string | null = null;
  let markedOldFilePath: string | null = null;
  const uploadsBaseDir = path.join(process.cwd(), 'public', 'uploads', 'materials');

  try {
    const paramsObject = await context.params;
    const validatedRouteParams = routeParamsSchema.safeParse(paramsObject);
    if (!validatedRouteParams.success) {
      return NextResponse.json(
        { error: 'Invalid material slug in URL', details: validatedRouteParams.error.flatten() },
        { status: 400 },
      );
    }
    const { slug } = validatedRouteParams.data;

    // JSONリクエストボディを解析
    const body = await request.json();
    const validatedBody = updateMaterialSchema.safeParse(body);

    if (!validatedBody.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validatedBody.error.flatten() },
        { status: 400 },
      );
    }

    const updateData: Prisma.MaterialUpdateInput = {};
    if (validatedBody.data.title !== undefined) updateData.title = validatedBody.data.title;
    if (validatedBody.data.recordedAt !== undefined)
      updateData.recordedAt = new Date(validatedBody.data.recordedAt);
    // memo, locationName は nullable なので、 validatedBody.data に存在すればそのままセット
    if (validatedBody.data.hasOwnProperty('memo')) updateData.memo = validatedBody.data.memo;
    if (validatedBody.data.hasOwnProperty('locationName'))
      updateData.locationName = validatedBody.data.locationName;

    if (validatedBody.data.latitude !== undefined)
      updateData.latitude = validatedBody.data.latitude;
    if (validatedBody.data.longitude !== undefined)
      updateData.longitude = validatedBody.data.longitude;
    if (validatedBody.data.rating !== undefined) updateData.rating = validatedBody.data.rating;

    // ファイルの処理
    if (
      validatedBody.data.tempFileId &&
      validatedBody.data.fileName &&
      validatedBody.data.replaceFile
    ) {
      // 既存のファイルパスを取得
      const existingMaterial = await prisma.material.findUnique({
        where: { slug },
        select: {
          filePath: true,
          fileFormat: true,
          sampleRate: true,
          bitDepth: true,
          durationSeconds: true,
          channels: true,
        },
      });

      if (existingMaterial?.filePath) {
        oldFilePath = existingMaterial.filePath;
        // 古いファイルを削除用にマーク
        const oldAbsolutePath = path.join(process.cwd(), 'public', oldFilePath);
        if (await checkFileExists(oldAbsolutePath)) {
          markedOldFilePath = await markFileForDeletion(oldAbsolutePath);
        }
      }

      // AudioMetadataServiceを使用してファイルを処理
      const audioMetadataService = new AudioMetadataService();

      // 一時ファイルの確認
      const tempFileExists = await audioMetadataService.verifyTempFile(
        validatedBody.data.tempFileId,
      );
      if (!tempFileExists) {
        // マークした古いファイルを元に戻す
        if (markedOldFilePath) {
          try {
            await unmarkFileForDeletion(markedOldFilePath);
          } catch (e) {
            console.warn('Failed to restore marked old file:', e);
          }
        }
        return NextResponse.json({ error: 'Temporary file not found' }, { status: 404 });
      }

      // ファイル名の生成
      const uniqueFileName = `${uuidv4()}_${validatedBody.data.fileName}`;

      // 一時ファイルを永続化
      let filePath: string;
      try {
        filePath = await audioMetadataService.persistTempFile(
          validatedBody.data.tempFileId,
          uniqueFileName,
        );
        newFilePathForCleanup = filePath; // クリーンアップ用に保持
      } catch (error) {
        console.error('Failed to persist temp file:', error);
        // マークした古いファイルを元に戻す
        if (markedOldFilePath) {
          try {
            await unmarkFileForDeletion(markedOldFilePath);
          } catch (e) {
            console.warn('Failed to restore marked old file:', e);
          }
        }
        return NextResponse.json({ error: 'Failed to persist file' }, { status: 500 });
      }

      // データベース用のファイルパス
      const filePathForDb = filePath.replace(process.cwd() + '/public', '');
      updateData.filePath = filePathForDb;

      // メタデータも再解析して更新
      try {
        const metadata = await audioMetadataService.analyzeAudio(validatedBody.data.tempFileId);
        updateData.fileFormat = metadata.fileFormat;
        updateData.sampleRate = metadata.sampleRate;
        updateData.bitDepth = metadata.bitDepth;
        updateData.durationSeconds = metadata.durationSeconds;
        updateData.channels = metadata.channels;
      } catch (error) {
        console.error('Failed to analyze audio metadata:', error);
        // メタデータ解析に失敗しても、ファイルの保存は成功しているので続行
        // 既存のメタデータをクリア
        updateData.fileFormat = null;
        updateData.sampleRate = null;
        updateData.bitDepth = null;
        updateData.durationSeconds = null;
        updateData.channels = null;
      }
    }

    const updatedMaterial = await prisma.$transaction(async (tx) => {
      const material = await tx.material.update({
        where: { slug },
        data: updateData,
      });

      if (!material) {
        throw new Error('Material not found for update');
      }

      if (validatedBody.data.tags) {
        await tx.material.update({
          where: { id: material.id },
          data: {
            tags: {
              // material.tags は Tag[] 型と仮定 (暗黙の中間テーブル)
              set: [], // 既存の関連をすべて解除
              connectOrCreate: validatedBody.data.tags.map((tagName: string) => ({
                where: { name: tagName },
                create: {
                  name: tagName,
                  slug: tagName.toLowerCase().replace(/\s+/g, '-'),
                },
              })),
            },
          },
        });
      }

      // 機材の更新処理
      if (validatedBody.data.equipmentIds) {
        // 機材IDの検証
        const existingEquipments = await tx.equipment.findMany({
          where: {
            id: { in: validatedBody.data.equipmentIds },
          },
        });

        const existingIds = existingEquipments.map((e: { id: string }) => e.id);
        const invalidIds = validatedBody.data.equipmentIds.filter(
          (id) => !existingIds.includes(id),
        );

        if (invalidIds.length > 0) {
          throw new Error(`Invalid equipment IDs: ${invalidIds.join(', ')}`);
        }

        await tx.material.update({
          where: { id: material.id },
          data: {
            equipments: {
              set: [], // 既存の関連をすべて解除
              connect: validatedBody.data.equipmentIds.map((id) => ({ id })),
            },
          },
        });
      }

      return tx.material.findUnique({
        where: { id: material.id },
        include: {
          tags: true, // tags が Tag[] 型の場合
          equipments: true, // equipments が Equipment[] 型の場合
        },
      });
    });

    if (!updatedMaterial) {
      // トランザクションが失敗した場合 (materialが見つからないなど)
      if (newFilePathForCleanup) {
        // 新しいファイルを保存してしまっていたら削除
        try {
          await fs.unlink(newFilePathForCleanup);
        } catch (e: unknown) {
          console.warn('Failed to clean up new file after transaction error:', e);
        }
      }
      return NextResponse.json({ error: 'Material not found or update failed' }, { status: 404 });
    }

    // トランザクション成功後、マークした古いファイルを削除
    if (markedOldFilePath) {
      try {
        await deleteFile(markedOldFilePath, {
          allowedBaseDir: uploadsBaseDir,
          materialId: updatedMaterial.id,
          skipValidation: true,
        });
      } catch (e) {
        console.warn(`Failed to delete old file: ${markedOldFilePath}`, e);
      }
    }

    return NextResponse.json(updatedMaterial);
  } catch (error) {
    console.error('Failed to update material:', error);
    // エラー発生時のクリーンアップ
    if (newFilePathForCleanup) {
      try {
        await fs.unlink(newFilePathForCleanup);
      } catch (e) {
        console.warn('Failed to clean up new file after error:', e);
      }
    }
    // マークした古いファイルを元に戻す
    if (markedOldFilePath) {
      try {
        await unmarkFileForDeletion(markedOldFilePath);
      } catch (e) {
        console.warn('Failed to restore marked old file:', e);
      }
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.flatten() },
        { status: 400 },
      );
    }
    if (error instanceof Error && error.message === 'Material not found for update') {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 });
    }

    // Prismaのユニーク制約違反エラーの処理
    // instanceof の代わりにエラーの構造を直接チェック（CI環境での互換性向上）
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'P2002' &&
      'meta' in error &&
      error.meta &&
      typeof error.meta === 'object' &&
      'target' in error.meta
    ) {
      const target = error.meta.target as string[];
      if (target.includes('title')) {
        return NextResponse.json({ error: ERROR_MESSAGES.MATERIAL_TITLE_EXISTS }, { status: 409 });
      }
    }

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  let markedFilePath: string | null = null;
  const uploadsBaseDir = path.join(process.cwd(), 'public', 'uploads', 'materials');

  try {
    const paramsObject = await context.params;
    const validatedRouteParams = routeParamsSchema.safeParse(paramsObject);

    if (!validatedRouteParams.success) {
      return NextResponse.json(
        { error: 'Invalid material slug in URL', details: validatedRouteParams.error.flatten() },
        { status: 400 },
      );
    }
    const { slug } = validatedRouteParams.data;

    const materialToDelete = await prisma.material.findUnique({
      where: { slug },
      select: { id: true, filePath: true },
    });
    if (!materialToDelete) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 });
    }

    const filePathToDelete = materialToDelete.filePath;

    // ステップ1: ファイルを削除用にマーク（存在する場合）
    if (filePathToDelete) {
      const absoluteFilePath = path.join(process.cwd(), 'public', filePathToDelete);
      if (await checkFileExists(absoluteFilePath)) {
        markedFilePath = await markFileForDeletion(absoluteFilePath);
      }
    }

    try {
      // ステップ2: データベーストランザクション
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // 関連レコードの削除: Materialのtagsとequipmentsリレーションを空にする
        await tx.material.update({
          where: { id: materialToDelete.id },
          data: {
            tags: { set: [] }, // 関連するTagの解除
            equipments: { set: [] }, // 関連するEquipmentの解除
          },
        });

        // 素材レコードの削除
        await tx.material.delete({ where: { id: materialToDelete.id } });
      });

      // ステップ3: DBトランザクション成功後、実際にファイルを削除
      if (markedFilePath) {
        try {
          await deleteFile(markedFilePath, {
            allowedBaseDir: uploadsBaseDir,
            materialId: materialToDelete.id,
            skipValidation: true, // すでにマーク済みのパスなので検証スキップ
          });
        } catch (fileError) {
          // ファイル削除エラーは記録するが、DB削除は成功しているので処理を継続
          const error = fileError as FileSystemError;
          if (error.code !== 'ENOENT') {
            console.error(`Failed to delete marked file ${markedFilePath}:`, fileError);
          }
        }
      }

      return NextResponse.json({ message: 'Material deleted successfully' }, { status: 200 });
    } catch (dbError) {
      // DBトランザクション失敗時：マークしたファイルを元に戻す
      if (markedFilePath) {
        try {
          await unmarkFileForDeletion(markedFilePath);
        } catch (restoreError) {
          console.error('Failed to restore marked file after DB error:', restoreError);
        }
      }
      throw dbError; // エラーを再スロー
    }
  } catch (error) {
    console.error('Failed to delete material:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
