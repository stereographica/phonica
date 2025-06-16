import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const routeParamsSchema = z.object({
  slug: z.string().trim().min(1, { message: 'Project slug cannot be empty.' }),
  materialId: z.string().trim().min(1, { message: 'Material ID cannot be empty.' }),
});

type RouteContext = {
  params: Promise<{ slug: string; materialId: string }>;
};

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const paramsObject = await context.params;
    const validatedParams = routeParamsSchema.safeParse(paramsObject);

    if (!validatedParams.success) {
      return NextResponse.json(
        { error: 'Invalid project slug or material ID', details: validatedParams.error.flatten() },
        { status: 400 },
      );
    }

    const { slug: projectSlug, materialId } = validatedParams.data;

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

    // 関連付けが存在するかチェック
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

    if (!existingRelation) {
      return NextResponse.json(
        { error: 'Material is not associated with this project' },
        { status: 404 },
      );
    }

    // 素材をプロジェクトから削除
    const updatedProject = await prisma.project.update({
      where: { slug: projectSlug },
      data: {
        materials: {
          disconnect: { id: materialId },
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

    return NextResponse.json(responseData, { status: 200 });
  } catch (error) {
    console.error('Failed to remove material from project:', error);
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
