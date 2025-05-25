import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import type { Prisma } from '@prisma/client'; // Prisma Namespaceをインポート
import { v4 as uuidv4 } from 'uuid'; // 追加
import fs from 'fs/promises'; // 追加
import path from 'path'; // 追加
// import type { Prisma } from '@prisma/client'; // Prisma Namespaceはここでは不要かも

const routeParamsSchema = z.object({
  slug: z.string().min(1, { message: "Material slug cannot be empty." }),
});

interface GetRequestContext {
  params: { slug: string };
}

export async function GET(
  request: NextRequest,
  context: GetRequestContext
) {
  try {
    const paramsObject = await context.params;
    // const receivedSlug = paramsObject.slug;
    // console.log('[GET /api/materials/[slug]] Received slug for processing:', receivedSlug);
    // console.log('[GET /api/materials/[slug]] Full params for validation:', JSON.stringify(paramsObject));

    const validatedParams = routeParamsSchema.safeParse(paramsObject);
    if (!validatedParams.success) {
      console.error('[GET /api/materials/[slug]] Validation failed:', validatedParams.error.flatten());
      return NextResponse.json(
        { error: "Invalid material slug", details: validatedParams.error.flatten() },
        { status: 400 }
      );
    }

    const { slug } = validatedParams.data;

    const material = await prisma.material.findUnique({
      where: { slug },
      include: {
        // category: true, // Categoryリレーションはスキーマにないため削除
        tags: true,       // MaterialTagsリレーションを経由してTagモデルの配列を取得
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
      description: material.memo, // `memo` を `description`としてマップ (または `memo` のまま送信)
      recordedDate: material.recordedAt.toISOString(),
      categoryName: null, // スキーマにCategoryがないためnull
      tags: material.tags.map(tag => ({
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
      })),
      filePath: material.filePath,
      fileFormat: material.fileFormat, // スキーマに合わせて追加
      // fileSize: material.fileSize, // スキーマにないのでコメントアウト (必要なら追加)
      // durationSeconds: material.durationSeconds, // スキーマにないのでコメントアウト
      sampleRate: material.sampleRate,
      bitDepth: material.bitDepth,
      // channels: material.channels, // スキーマにないのでコメントアウト
      latitude: material.latitude,
      longitude: material.longitude,
      locationName: material.locationName, // スキーマに合わせて追加
      rating: material.rating,
      notes: material.memo, // `memo` を `notes` としてもマップ (どちらか一方、または両方。仕様による)
      equipments: material.equipments.map(equipment => ({
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
    console.error("Failed to fetch material:", error);
    if (error instanceof z.ZodError) {
        return NextResponse.json({ error: "Invalid request parameters", details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Internal Server Error', details: (error instanceof Error) ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PUTリクエストのボディのスキーマ定義
const updateMaterialSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  recordedAt: z.string().datetime({ message: "Invalid datetime string. Must be UTC ISO8601." }).optional(),
  memo: z.string().nullable().optional(),
  tags: z.array(z.string().min(1)).optional(), // タグ名の配列
  fileFormat: z.string().nullable().optional(),
  sampleRate: z.number().int().positive().nullable().optional(),
  bitDepth: z.number().int().positive().nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  locationName: z.string().nullable().optional(),
  rating: z.number().int().min(0).max(5).nullable().optional(),
  // file: z.instanceof(File).optional(), // FormData を使う場合、スキーマでの直接バリデーションは難しいことがある
});

interface PutOrDeleteRequestContext {
  params: { slug: string };
}

export async function PUT(
  request: NextRequest,
  context: PutOrDeleteRequestContext
) {
  let oldFilePath: string | null = null;
  let newFilePathForCleanup: string | null = null;

  try {
    const paramsObject = await context.params;
    const validatedRouteParams = routeParamsSchema.safeParse(paramsObject);
    if (!validatedRouteParams.success) {
      return NextResponse.json(
        { error: "Invalid material slug in URL", details: validatedRouteParams.error.flatten() },
        { status: 400 }
      );
    }
    const { slug } = validatedRouteParams.data;

    const formData = await request.formData();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsedData: Record<string, any> = {};
    let fileToSave: File | null = null;

    for (const [key, value] of formData.entries()) {
      if (key === 'file' && value instanceof File && value.size > 0) {
        fileToSave = value;
        // スキーマバリデーションのため、ファイル情報をparsedDataに含めるか別途検討
        // parsedData[key] = value; // zodスキーマはFileインスタンスを直接は扱いにくい
        continue;
      }
      if (key === 'tags' && typeof value === 'string') {
        parsedData[key] = value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      } else if (key === 'sampleRate' || key === 'bitDepth' || key === 'rating') {
        parsedData[key] = value && typeof value === 'string' && value.trim() !== '' ? parseInt(value, 10) : null;
      } else if (key === 'latitude' || key === 'longitude') {
        parsedData[key] = value && typeof value === 'string' && value.trim() !== '' ? parseFloat(value) : null;
      } else if (typeof value === 'string') {
        parsedData[key] = value.trim() === '' && (key === 'memo' || key === 'fileFormat' || key === 'locationName') ? null : value;
      } else {
        // その他の型の値は一旦そのまま保持 (必要ならエラー処理)
        parsedData[key] = value;
      }
    }
    
    // recordedAtは文字列として受け取り、スキーマでdatetimeとして検証される
    if (formData.has('recordedAt') && typeof formData.get('recordedAt') === 'string'){
        parsedData.recordedAt = formData.get('recordedAt') as string;
    }

    const validatedBody = updateMaterialSchema.safeParse(parsedData);

    if (!validatedBody.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validatedBody.error.flatten() },
        { status: 400 }
      );
    }

    const updateData: Prisma.MaterialUpdateInput = {};
    if (validatedBody.data.title !== undefined) updateData.title = validatedBody.data.title;
    if (validatedBody.data.recordedAt !== undefined) updateData.recordedAt = new Date(validatedBody.data.recordedAt);
    // memo, fileFormat, locationName は nullable なので、 validatedBody.data に存在すればそのままセット
    if (validatedBody.data.hasOwnProperty('memo')) updateData.memo = validatedBody.data.memo;
    if (validatedBody.data.hasOwnProperty('fileFormat')) updateData.fileFormat = validatedBody.data.fileFormat;
    if (validatedBody.data.hasOwnProperty('locationName')) updateData.locationName = validatedBody.data.locationName;

    if (validatedBody.data.sampleRate !== undefined) updateData.sampleRate = validatedBody.data.sampleRate;
    if (validatedBody.data.bitDepth !== undefined) updateData.bitDepth = validatedBody.data.bitDepth;
    if (validatedBody.data.latitude !== undefined) updateData.latitude = validatedBody.data.latitude;
    if (validatedBody.data.longitude !== undefined) updateData.longitude = validatedBody.data.longitude;
    if (validatedBody.data.rating !== undefined) updateData.rating = validatedBody.data.rating;

    if (fileToSave) {
      const existingMaterial = await prisma.material.findUnique({ where: { slug }, select: { filePath: true } });
      if (existingMaterial?.filePath) {
        oldFilePath = existingMaterial.filePath;
      }

      const fileExtension = path.extname(fileToSave.name);
      const fileName = `${uuidv4()}${fileExtension}`;
      const relativeFilePath = path.join('uploads', 'materials', fileName);
      const absoluteFilePath = path.join(process.cwd(), 'public', relativeFilePath);
      newFilePathForCleanup = absoluteFilePath; // クリーンアップ用に保持

      await fs.mkdir(path.dirname(absoluteFilePath), { recursive: true });
      await fs.writeFile(absoluteFilePath, Buffer.from(await fileToSave.arrayBuffer()));
      updateData.filePath = relativeFilePath; // DBには相対パスを保存
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
            tags: { // material.tags は Tag[] 型と仮定 (暗黙の中間テーブル)
              set: [], // 既存の関連をすべて解除
              connectOrCreate: validatedBody.data.tags.map((tagName: string) => ({
                where: { name: tagName },
                create: { 
                  name: tagName, 
                  slug: tagName.toLowerCase().replace(/\s+/g, '-') 
                },
              })),
            },
          },
        });
      }
      
      // TODO: 機材(Equipment)の更新処理も同様にリレーションAPIを使用してここに追加する
      // if (validatedBody.data.equipments) { ... }

      return tx.material.findUnique({
        where: { id: material.id },
        include: { 
          tags: true, // tags が Tag[] 型の場合
          equipments: true // equipments が Equipment[] 型の場合
        },
      });
    });

    if (!updatedMaterial) {
      // トランザクションが失敗した場合 (materialが見つからないなど)
      if (newFilePathForCleanup) { // 新しいファイルを保存してしまっていたら削除
        try { await fs.unlink(newFilePathForCleanup); } catch (e) { console.warn('Failed to clean up new file after transaction error:', e); }
      }
      return NextResponse.json({ error: 'Material not found or update failed' }, { status: 404 });
    }

    // トランザクション成功後、古いファイルがあれば削除
    if (oldFilePath) {
      try {
        await fs.unlink(path.join(process.cwd(), 'public', oldFilePath));
      } catch (e) {
        console.warn(`Failed to delete old file: ${oldFilePath}`, e);
      }
    }

    return NextResponse.json(updatedMaterial);

  } catch (error) {
    console.error("Failed to update material:", error);
    // エラー発生時、もし新しいファイルが作成途中だったら削除
    if (newFilePathForCleanup) {
        try { await fs.unlink(newFilePathForCleanup); } catch (e) { console.warn('Failed to clean up new file after error:', e); }
    }
    if (error instanceof z.ZodError) {
        return NextResponse.json({ error: "Invalid request data", details: error.flatten() }, { status: 400 });
    }
    if (error instanceof Error && error.message === 'Material not found for update') {
        return NextResponse.json({ error: 'Material not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Internal Server Error', details: (error instanceof Error) ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest, 
  context: PutOrDeleteRequestContext
) {
  try {
    const paramsObject = await context.params;
    const validatedRouteParams = routeParamsSchema.safeParse(paramsObject);

    if (!validatedRouteParams.success) {
      return NextResponse.json(
        { error: "Invalid material slug in URL", details: validatedRouteParams.error.flatten() },
        { status: 400 }
      );
    }
    const { slug } = validatedRouteParams.data;

    const materialToDelete = await prisma.material.findUnique({ 
        where: { slug },
        select: { id: true } // 削除前にIDだけ取得すれば十分
    });
    if (!materialToDelete) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // 関連レコードの解除 (tags と equipments)
      // スキーマで onDelete: Cascade が設定されていれば不要な場合もあるが、明示的に行う
      await tx.material.update({
        where: { id: materialToDelete.id },
        data: {
          tags: { set: [] },       // 関連するタグをすべて解除
          equipments: { set: [] }, // 関連する機材をすべて解除 (スキーマ定義に依存)
        },
      });

      // 素材本体の削除
      await tx.material.delete({ where: { id: materialToDelete.id } });
    });

    return NextResponse.json({ message: 'Material deleted successfully' }, { status: 200 });

  } catch (error) {
    console.error("Failed to delete material:", error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: (error instanceof Error) ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 
