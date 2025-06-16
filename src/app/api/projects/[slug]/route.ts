import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

const routeParamsSchema = z.object({
  slug: z.string().trim().min(1, { message: 'Project slug cannot be empty.' }),
});

const UpdateProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  description: z.string().nullable().optional(),
});

type RouteContext = {
  params: Promise<{ slug: string }>;
};

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

    const { slug } = validatedParams.data;

    const project = await prisma.project.findUnique({
      where: { slug },
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

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const responseData = {
      id: project.id,
      slug: project.slug,
      name: project.name,
      description: project.description,
      materialsCount: project._count.materials,
      materials: project.materials.map((material) => ({
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
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Failed to fetch project:', error);
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

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const paramsObject = await context.params;
    const validatedRouteParams = routeParamsSchema.safeParse(paramsObject);

    if (!validatedRouteParams.success) {
      return NextResponse.json(
        { error: 'Invalid project slug in URL', details: validatedRouteParams.error.flatten() },
        { status: 400 },
      );
    }

    const { slug } = validatedRouteParams.data;
    const body = await request.json();

    const validatedBody = UpdateProjectSchema.safeParse(body);

    if (!validatedBody.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validatedBody.error.flatten() },
        { status: 400 },
      );
    }

    const updateData: Prisma.ProjectUpdateInput = {};

    if (validatedBody.data.name !== undefined) {
      updateData.name = validatedBody.data.name;
      updateData.slug = slugify(validatedBody.data.name);
    }

    if (validatedBody.data.hasOwnProperty('description')) {
      updateData.description = validatedBody.data.description;
    }

    const updatedProject = await prisma.project.update({
      where: { slug },
      data: updateData,
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

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Failed to update project:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.flatten() },
        { status: 400 },
      );
    }
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
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
      Array.isArray(error.meta.target) &&
      error.meta.target.includes('slug')
    ) {
      return NextResponse.json(
        { error: 'Failed to update project: Slug already exists. Please change the name.' },
        { status: 409 },
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

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const paramsObject = await context.params;
    const validatedRouteParams = routeParamsSchema.safeParse(paramsObject);

    if (!validatedRouteParams.success) {
      return NextResponse.json(
        { error: 'Invalid project slug in URL', details: validatedRouteParams.error.flatten() },
        { status: 400 },
      );
    }

    const { slug } = validatedRouteParams.data;

    const projectToDelete = await prisma.project.findUnique({
      where: { slug },
      select: { id: true, name: true },
    });

    if (!projectToDelete) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.project.update({
        where: { id: projectToDelete.id },
        data: {
          materials: { set: [] },
        },
      });

      await tx.project.delete({ where: { id: projectToDelete.id } });
    });

    return NextResponse.json({ message: 'Project deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Failed to delete project:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
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
