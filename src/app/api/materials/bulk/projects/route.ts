import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const BulkProjectsSchema = z.object({
  materialIds: z.array(z.string()).min(1, 'At least one material ID is required'),
  projectId: z.string().min(1, 'Project ID is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedBody = BulkProjectsSchema.safeParse(body);

    if (!validatedBody.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validatedBody.error.flatten() },
        { status: 400 },
      );
    }

    const { materialIds, projectId } = validatedBody.data;

    // Verify all materials exist
    const materials = await prisma.material.findMany({
      where: { id: { in: materialIds } },
      select: { id: true, title: true },
    });

    const foundMaterialIds = materials.map((m) => m.id);
    const notFoundMaterialIds = materialIds.filter((id) => !foundMaterialIds.includes(id));

    if (notFoundMaterialIds.length > 0) {
      return NextResponse.json(
        { error: `Materials not found: ${notFoundMaterialIds.join(', ')}` },
        { status: 404 },
      );
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, slug: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get materials already in the project
    const existingMaterials = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        materials: {
          where: { id: { in: materialIds } },
          select: { id: true },
        },
      },
    });

    const existingMaterialIds = existingMaterials?.materials.map((m) => m.id) || [];
    const newMaterialIds = materialIds.filter((id) => !existingMaterialIds.includes(id));

    if (newMaterialIds.length === 0) {
      return NextResponse.json({
        success: true,
        project: {
          id: project.id,
          name: project.name,
          slug: project.slug,
        },
        addedCount: 0,
        alreadyInProject: materialIds.length,
        message: 'All selected materials are already in this project',
      });
    }

    // Add materials to project
    const result = await prisma.project.update({
      where: { id: projectId },
      data: {
        materials: {
          connect: newMaterialIds.map((id) => ({ id })),
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: { materials: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      project: {
        id: result.id,
        name: result.name,
        slug: result.slug,
      },
      addedCount: newMaterialIds.length,
      alreadyInProject: existingMaterialIds.length,
      totalMaterials: result._count.materials,
    });
  } catch (error) {
    console.error('Failed to bulk add materials to project:', error);

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
