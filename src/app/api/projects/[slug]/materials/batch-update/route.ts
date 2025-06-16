import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const routeParamsSchema = z.object({
  slug: z.string().trim().min(1, { message: 'Project slug cannot be empty.' }),
});

const BatchUpdateSchema = z.object({
  add: z.array(z.string()).optional().default([]),
  remove: z.array(z.string()).optional().default([]),
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

    const validatedBody = BatchUpdateSchema.safeParse(body);

    if (!validatedBody.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validatedBody.error.flatten() },
        { status: 400 },
      );
    }

    const { add, remove } = validatedBody.data;

    // Check if there are any operations to perform
    if (add.length === 0 && remove.length === 0) {
      return NextResponse.json({ error: 'No operations to perform' }, { status: 400 });
    }

    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { slug: projectSlug },
      select: { id: true, name: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Validate material IDs to add
    if (add.length > 0) {
      const materialsToAdd = await prisma.material.findMany({
        where: { id: { in: add } },
        select: { id: true },
      });

      const foundIds = materialsToAdd.map((m) => m.id);
      const notFoundIds = add.filter((id) => !foundIds.includes(id));

      if (notFoundIds.length > 0) {
        return NextResponse.json(
          { error: `Materials not found: ${notFoundIds.join(', ')}` },
          { status: 404 },
        );
      }
    }

    // Validate material IDs to remove
    if (remove.length > 0) {
      const currentMaterials = await prisma.project.findUnique({
        where: { slug: projectSlug },
        select: {
          materials: {
            where: { id: { in: remove } },
            select: { id: true },
          },
        },
      });

      const currentIds = currentMaterials?.materials.map((m) => m.id) || [];
      const notInProjectIds = remove.filter((id) => !currentIds.includes(id));

      if (notInProjectIds.length > 0) {
        return NextResponse.json(
          { error: `Materials not in project: ${notInProjectIds.join(', ')}` },
          { status: 400 },
        );
      }
    }

    // Perform batch update in a transaction
    const result = await prisma.$transaction(async (tx) => {
      let updatedProject = project;

      // Add materials
      if (add.length > 0) {
        updatedProject = await tx.project.update({
          where: { slug: projectSlug },
          data: {
            materials: {
              connect: add.map((id) => ({ id })),
            },
          },
          select: { id: true, name: true },
        });
      }

      // Remove materials
      if (remove.length > 0) {
        updatedProject = await tx.project.update({
          where: { slug: projectSlug },
          data: {
            materials: {
              disconnect: remove.map((id) => ({ id })),
            },
          },
          select: { id: true, name: true },
        });
      }

      return updatedProject;
    });

    // Get updated material count
    const updatedCount = await prisma.material.count({
      where: {
        projects: {
          some: {
            slug: projectSlug,
          },
        },
      },
    });

    return NextResponse.json({
      project: {
        id: result.id,
        name: result.name,
        slug: projectSlug,
      },
      operations: {
        added: add.length,
        removed: remove.length,
      },
      totalMaterials: updatedCount,
    });
  } catch (error) {
    console.error('Failed to batch update project materials:', error);

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
