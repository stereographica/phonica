import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const routeParamsSchema = z.object({
  slug: z.string().trim().min(1, { message: 'Project slug cannot be empty.' }),
});

const AddMaterialSchema = z.object({
  materialId: z.string().min(1, 'Material ID is required'),
});

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const paramsObject = await context.params;
    const validatedParams = routeParamsSchema.safeParse(paramsObject);

    if (!validatedParams.success) {
      return NextResponse.json(
        { error: 'Invalid project slug', details: validatedParams.error.flatten() },
        { status: 400 },
      );
    }

    const { slug: projectSlug } = validatedParams.data;
    const body = await request.json();

    const validatedBody = AddMaterialSchema.safeParse(body);

    if (!validatedBody.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validatedBody.error.flatten() },
        { status: 400 },
      );
    }

    const { materialId } = validatedBody.data;

    // プロジェクトの存在確認
    const project = await prisma.project.findUnique({
      where: { slug: projectSlug },
      select: { id: true, name: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // 素材の存在確認
    const material = await prisma.material.findUnique({
      where: { id: materialId },
      select: { id: true, title: true },
    });

    if (!material) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 });
    }

    // 既に関連付けられているかチェック
    const existingRelation = await prisma.project.findFirst({
      where: {
        slug: projectSlug,
        materials: {
          some: {
            id: materialId,
          },
        },
      },
    });

    if (existingRelation) {
      return NextResponse.json(
        { error: 'Material is already associated with this project' },
        { status: 409 },
      );
    }

    // 素材をプロジェクトに追加
    const updatedProject = await prisma.project.update({
      where: { slug: projectSlug },
      data: {
        materials: {
          connect: { id: materialId },
        },
      },
      include: {
        materials: {
          select: {
            id: true,
            slug: true,
            title: true,
            filePath: true,
            fileFormat: true,
            recordedAt: true,
            locationName: true,
            rating: true,
            memo: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        _count: {
          select: {
            materials: true,
          },
        },
      },
    });

    const responseData = {
      id: updatedProject.id,
      slug: updatedProject.slug,
      name: updatedProject.name,
      description: updatedProject.description,
      materialsCount: updatedProject._count.materials,
      materials: updatedProject.materials.map((material) => ({
        id: material.id,
        slug: material.slug,
        title: material.title,
        filePath: material.filePath,
        fileFormat: material.fileFormat,
        recordedAt: material.recordedAt.toISOString(),
        locationName: material.locationName,
        rating: material.rating,
        memo: material.memo,
        createdAt: material.createdAt.toISOString(),
        updatedAt: material.updatedAt.toISOString(),
      })),
      createdAt: updatedProject.createdAt.toISOString(),
      updatedAt: updatedProject.updatedAt.toISOString(),
    };

    return NextResponse.json(responseData, { status: 201 });
  } catch (error) {
    console.error('Failed to add material to project:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.flatten() },
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

const GetMaterialsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
});

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const paramsObject = await context.params;
    const validatedParams = routeParamsSchema.safeParse(paramsObject);

    if (!validatedParams.success) {
      return NextResponse.json(
        { error: 'Invalid project slug', details: validatedParams.error.flatten() },
        { status: 400 },
      );
    }

    const { slug: projectSlug } = validatedParams.data;

    // URLパラメータを取得
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams);

    const validationResult = GetMaterialsQuerySchema.safeParse(queryParams);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validationResult.error.flatten() },
        { status: 400 },
      );
    }

    const { page, limit } = validationResult.data;
    const skip = (page - 1) * limit;

    // プロジェクトの存在確認
    const project = await prisma.project.findUnique({
      where: { slug: projectSlug },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // プロジェクトに関連する素材を取得
    const materials = await prisma.material.findMany({
      where: {
        projects: {
          some: {
            slug: projectSlug,
          },
        },
      },
      skip,
      take: limit,
      include: {
        tags: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: {
        recordedAt: 'desc',
      },
    });

    // 総数を取得
    const totalMaterials = await prisma.material.count({
      where: {
        projects: {
          some: {
            slug: projectSlug,
          },
        },
      },
    });

    const totalPages = Math.ceil(totalMaterials / limit);

    const formattedMaterials = materials.map((material) => ({
      id: material.id,
      slug: material.slug,
      title: material.title,
      recordedAt: material.recordedAt.toISOString(),
      tags: material.tags,
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
    console.error('Failed to fetch project materials:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.flatten() },
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
