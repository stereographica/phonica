import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const routeParamsSchema = z.object({
  id: z.string().trim().min(1, { message: "Project ID cannot be empty." }),
});

const AddMaterialSchema = z.object({
  materialId: z.string().min(1, 'Material ID is required'),
});

type RouteContext = {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const paramsObject = await context.params;
    const validatedParams = routeParamsSchema.safeParse(paramsObject);
    
    if (!validatedParams.success) {
      return NextResponse.json(
        { error: "Invalid project ID", details: validatedParams.error.flatten() },
        { status: 400 }
      );
    }

    const { id: projectId } = validatedParams.data;
    const body = await request.json();
    
    const validatedBody = AddMaterialSchema.safeParse(body);

    if (!validatedBody.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validatedBody.error.flatten() },
        { status: 400 }
      );
    }

    const { materialId } = validatedBody.data;

    // プロジェクトの存在確認
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // 素材の存在確認
    const material = await prisma.material.findUnique({
      where: { id: materialId },
      select: { id: true, title: true }
    });

    if (!material) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 });
    }

    // 既に関連付けられているかチェック
    const existingRelation = await prisma.project.findFirst({
      where: {
        id: projectId,
        materials: {
          some: {
            id: materialId
          }
        }
      }
    });

    if (existingRelation) {
      return NextResponse.json(
        { error: 'Material is already associated with this project' },
        { status: 409 }
      );
    }

    // 素材をプロジェクトに追加
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        materials: {
          connect: { id: materialId }
        }
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
          }
        },
        _count: {
          select: {
            materials: true,
          }
        }
      },
    });

    const responseData = {
      id: updatedProject.id,
      slug: updatedProject.slug,
      name: updatedProject.name,
      description: updatedProject.description,
      materialsCount: updatedProject._count.materials,
      materials: updatedProject.materials.map(material => ({
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
    console.error("Failed to add material to project:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request data", details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Internal Server Error', details: (error instanceof Error) ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}