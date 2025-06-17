import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import { AudioMetadataService } from '@/lib/audio-metadata';
import { generateUniqueSlug } from '@/lib/slug-generator';
import { ERROR_MESSAGES } from '@/lib/error-messages';

// 新しいPOSTリクエストのスキーマ（メタデータ抽出対応）
const CreateMaterialWithMetadataSchema = z.object({
  title: z.string().min(1),
  tempFileId: z.string().min(1),
  fileName: z.string().min(1),
  recordedAt: z.string().datetime(),
  memo: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  equipmentIds: z.array(z.string()).optional().default([]),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  locationName: z.string().optional().nullable(),
  rating: z.number().int().min(1).max(5).optional().nullable(),
  metadata: z.object({
    fileFormat: z.string(),
    sampleRate: z.number(),
    bitDepth: z.number().nullable(),
    durationSeconds: z.number(),
    channels: z.number(),
  }),
});

// レガシーPOSTリクエストのスキーマ（下位互換性のため） - 現在は使用していない
// const CreateMaterialLegacySchema = z.object({
//   title: z.string().min(1),
//   recordedAt: z.string().datetime(),
//   memo: z.string().optional().nullable(),
//   tags: z.array(z.string()).optional().default([]),
//   equipmentIds: z.array(z.string()).optional().default([]),
//   fileFormat: z.string().optional().nullable(),
//   sampleRate: z.number().optional().nullable(),
//   bitDepth: z.number().optional().nullable(),
//   latitude: z.number().optional().nullable(),
//   longitude: z.number().optional().nullable(),
//   locationName: z.string().optional().nullable(),
//   rating: z.number().int().min(1).max(5).optional().nullable(),
// });

// クエリパラメータのバリデーションスキーマ
const GetMaterialsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  title: z.string().optional(),
  tag: z.string().optional(),
  includeProjectStatus: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams);

    const validationResult = GetMaterialsQuerySchema.safeParse(queryParams);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validationResult.error.flatten() },
        { status: 400 },
      );
    }

    const { page, limit, sortBy, sortOrder, title, tag, includeProjectStatus } =
      validationResult.data;

    const skip = (page - 1) * limit;

    // Prismaの検索条件を構築
    const where: Prisma.MaterialWhereInput = {};
    if (title) {
      where.title = {
        contains: title,
        mode: 'insensitive',
      };
    }
    if (tag) {
      where.tags = {
        some: {
          name: tag,
        },
      };
    }

    // Prismaのソート条件を構築
    const orderBy: Prisma.MaterialOrderByWithRelationInput = {};
    // 許可するソートキーを定義 (セキュリティのため)
    const allowedSortKeys: Array<keyof Prisma.MaterialOrderByWithRelationInput> = [
      'title',
      'createdAt',
      'recordedAt',
      'rating',
      'fileFormat',
      'sampleRate',
      'bitDepth',
    ];

    if (allowedSortKeys.includes(sortBy as keyof Prisma.MaterialOrderByWithRelationInput)) {
      orderBy[sortBy as keyof Prisma.MaterialOrderByWithRelationInput] = sortOrder;
    } else {
      orderBy['createdAt'] = sortOrder;
    }

    const materials = await prisma.material.findMany({
      where,
      skip,
      take: limit,
      include: {
        tags: true,
        equipments: true,
      },
      orderBy,
    });

    const totalMaterials = await prisma.material.count({ where });
    const totalPages = Math.ceil(totalMaterials / limit);

    // If includeProjectStatus is provided, get materials in that project
    let materialsInProject: Set<string> = new Set();
    if (includeProjectStatus) {
      const project = await prisma.project.findUnique({
        where: { slug: includeProjectStatus },
        select: {
          materials: {
            select: { id: true },
          },
        },
      });

      if (project) {
        materialsInProject = new Set(project.materials.map((m) => m.id));
      }
    }

    // APIレスポンスの形式を調整
    const formattedMaterials = materials.map((material) => ({
      id: material.id,
      title: material.title,
      filePath: material.filePath,
      recordedAt: material.recordedAt,
      memo: material.memo,
      tags: material.tags.map((t) => ({ id: t.id, name: t.name, slug: t.slug })),
      equipments: material.equipments.map((e) => ({ id: e.id, name: e.name, type: e.type })),
      fileFormat: material.fileFormat,
      sampleRate: material.sampleRate,
      bitDepth: material.bitDepth,
      durationSeconds: material.durationSeconds,
      channels: material.channels,
      latitude: material.latitude,
      longitude: material.longitude,
      locationName: material.locationName,
      rating: material.rating,
      createdAt: material.createdAt,
      updatedAt: material.updatedAt,
      slug: material.slug,
      ...(includeProjectStatus && { isInProject: materialsInProject.has(material.id) }),
    }));

    return NextResponse.json({
      data: formattedMaterials,
      pagination: {
        page,
        limit,
        totalPages,
        totalItems: totalMaterials,
      },
    });
  } catch (error) {
    console.error('Error fetching materials:', error);
    return NextResponse.json({ error: 'Failed to fetch materials' }, { status: 500 });
  }
}

// 新しい素材を登録するPOST処理（メタデータ抽出対応）
export async function POST(request: NextRequest) {
  try {
    // Content-Typeをチェックして処理を分岐
    const contentType = request.headers.get('content-type') || '';

    // JSONリクエスト（新しい方式）
    if (contentType.includes('application/json')) {
      const body = await request.json();

      // メタデータ抽出対応のバリデーション
      const validationResult = CreateMaterialWithMetadataSchema.safeParse(body);

      if (!validationResult.success) {
        return NextResponse.json(
          { error: 'Invalid request data', details: validationResult.error.flatten() },
          { status: 400 },
        );
      }

      const data = validationResult.data;

      // AudioMetadataServiceを使用してファイルを処理
      const audioMetadataService = new AudioMetadataService();

      // 一時ファイルの確認
      const tempFileExists = await audioMetadataService.verifyTempFile(data.tempFileId);
      if (!tempFileExists) {
        return NextResponse.json({ error: 'Temporary file not found' }, { status: 404 });
      }

      // ファイル名の生成
      const uniqueFileName = `${uuidv4()}_${data.fileName}`;

      // 一時ファイルを永続化
      let filePath: string;
      try {
        filePath = await audioMetadataService.persistTempFile(data.tempFileId, uniqueFileName);
      } catch (error) {
        console.error('Failed to persist temp file:', error);
        return NextResponse.json({ error: 'Failed to persist file' }, { status: 500 });
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
          return NextResponse.json(
            { error: `Invalid equipment IDs: ${invalidIds.join(', ')}` },
            { status: 400 },
          );
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

      return NextResponse.json(newMaterial, { status: 201 });
    }

    // FormDataリクエスト（レガシー方式）
    else if (contentType.includes('multipart/form-data')) {
      let formData: FormData;
      let file: File | null = null;
      let title: string | null = null;
      let recordedAt: string | null = null;
      let memo: string | null = null;
      let tagsStr: string | null = null;
      let fileFormat: string | null = null;
      let sampleRateStr: string | null = null;
      let bitDepthStr: string | null = null;
      let latitudeStr: string | null = null;
      let longitudeStr: string | null = null;
      let locationName: string | null = null;
      let ratingStr: string | null = null;
      let equipmentsStr: string | null = null;

      // FormDataのパースを試みる
      try {
        formData = await request.formData();
      } catch (formDataError) {
        console.error('FormData parse error:', formDataError);

        // Firefox/WebKitでのFormDataパースエラーの回避策
        return NextResponse.json(
          {
            error:
              'Failed to parse form data. This is a known issue with Firefox/WebKit. Please use the server action method or try using Chrome.',
            details: formDataError instanceof Error ? formDataError.message : String(formDataError),
            recommendation:
              'The application now uses server actions by default which should work across all browsers.',
          },
          { status: 400 },
        );
      }

      file = formData.get('file') as File | null;
      title = formData.get('title') as string | null;
      recordedAt = formData.get('recordedAt') as string | null;
      memo = formData.get('memo') as string | null;
      tagsStr = formData.get('tags') as string | null;
      fileFormat = formData.get('fileFormat') as string | null;
      sampleRateStr = formData.get('sampleRate') as string | null;
      bitDepthStr = formData.get('bitDepth') as string | null;
      latitudeStr = formData.get('latitude') as string | null;
      longitudeStr = formData.get('longitude') as string | null;
      locationName = formData.get('locationName') as string | null;
      ratingStr = formData.get('rating') as string | null;
      equipmentsStr = formData.get('equipmentIds') as string | null;

      if (!title || !recordedAt || !file) {
        return NextResponse.json({ error: ERROR_MESSAGES.REQUIRED_FIELD_MISSING }, { status: 400 });
      }

      const fileExtension = path.extname(file.name);
      // テスト環境の場合はファイル名にプレフィックスを付ける
      const fileNamePrefix = process.env.NODE_ENV === 'test' ? 'test-dummy-' : '';
      const uniqueFileName = `${fileNamePrefix}${uuidv4()}${fileExtension}`;
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'materials');
      const filePathInFilesystem = path.join(uploadDir, uniqueFileName);
      await fs.mkdir(uploadDir, { recursive: true });
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(filePathInFilesystem, fileBuffer);
      const filePathForDb = `/uploads/materials/${uniqueFileName}`;

      // ユニークなslugを生成
      const slug = await generateUniqueSlug(title, 'material');

      const tagsToConnect = tagsStr
        ? await Promise.all(
            tagsStr.split(',').map(async (tagName) => {
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
          return NextResponse.json(
            { error: `Invalid equipment IDs: ${invalidIds.join(', ')}` },
            { status: 400 },
          );
        }

        equipmentsToConnect = equipmentIds.map((id) => ({ id }));
      }

      const newMaterial = await prisma.material.create({
        data: {
          title,
          slug,
          filePath: filePathForDb,
          recordedAt: new Date(recordedAt),
          memo: memo === 'null' || memo === '' ? null : memo,
          fileFormat: fileFormat === 'null' || fileFormat === '' ? null : fileFormat,
          sampleRate: sampleRateStr ? parseInt(sampleRateStr) : null,
          bitDepth: bitDepthStr ? parseInt(bitDepthStr) : null,
          durationSeconds: null, // FormDataの場合はメタデータ抽出なし
          channels: null, // FormDataの場合はメタデータ抽出なし
          latitude: latitudeStr ? parseFloat(latitudeStr) || null : null,
          longitude: longitudeStr ? parseFloat(longitudeStr) || null : null,
          locationName: locationName === 'null' || locationName === '' ? null : locationName,
          rating: ratingStr ? parseInt(ratingStr) : null,
          tags: { connectOrCreate: tagsToConnect },
          equipments: {
            connect: equipmentsToConnect,
          },
        },
        include: { tags: true, equipments: true },
      });

      return NextResponse.json(newMaterial, { status: 201 });
    }

    // サポートされていないContent-Type
    else {
      return NextResponse.json(
        { error: 'Unsupported content type. Use application/json or multipart/form-data.' },
        { status: 400 },
      );
    }
  } catch (error: unknown) {
    console.error('Error creating material:', error);

    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        cause: error.cause,
      });
    }

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
        return NextResponse.json({ error: ERROR_MESSAGES.MATERIAL_TITLE_EXISTS }, { status: 409 });
      } else if (error.meta.target.includes('slug')) {
        // This shouldn't happen with generateUniqueSlug, but just in case
        return NextResponse.json(
          { error: 'Slugの生成に失敗しました。もう一度お試しください。' },
          { status: 409 },
        );
      }
    }

    return NextResponse.json({ error: ERROR_MESSAGES.DATABASE_ERROR }, { status: 500 });
  }
}
