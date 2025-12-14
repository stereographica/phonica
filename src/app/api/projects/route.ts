import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { constraintTargetIncludes } from '@/lib/utils/prisma-error';

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

const GetProjectsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  name: z.string().optional(),
});

const CreateProjectSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().nullable().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams);

    const validationResult = GetProjectsQuerySchema.safeParse(queryParams);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validationResult.error.flatten() },
        { status: 400 },
      );
    }

    const { page, limit, sortBy, sortOrder, name } = validationResult.data;

    const skip = (page - 1) * limit;

    const where: Prisma.ProjectWhereInput = {};
    if (name) {
      where.name = {
        contains: name,
        mode: 'insensitive',
      };
    }

    const orderBy: Prisma.ProjectOrderByWithRelationInput = {};
    const allowedSortKeys: Array<keyof Prisma.ProjectOrderByWithRelationInput> = [
      'name',
      'createdAt',
      'updatedAt',
    ];

    if (allowedSortKeys.includes(sortBy as keyof Prisma.ProjectOrderByWithRelationInput)) {
      orderBy[sortBy as keyof Prisma.ProjectOrderByWithRelationInput] = sortOrder;
    } else {
      orderBy['createdAt'] = sortOrder;
    }

    const projects = await prisma.project.findMany({
      where,
      skip,
      take: limit,
      include: {
        materials: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
        _count: {
          select: {
            materials: true,
          },
        },
      },
      orderBy,
    });

    const totalProjects = await prisma.project.count({ where });
    const totalPages = Math.ceil(totalProjects / limit);

    const formattedProjects = projects.map((project) => ({
      id: project.id,
      slug: project.slug,
      name: project.name,
      description: project.description,
      _count: project._count,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    }));

    return NextResponse.json({
      data: formattedProjects,
      pagination: {
        page,
        limit,
        totalPages,
        totalItems: totalProjects,
      },
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validationResult = CreateProjectSchema.safeParse(body);

    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error.flatten());
      return NextResponse.json(
        { error: 'Invalid request body', details: validationResult.error.flatten() },
        { status: 400 },
      );
    }

    const { name, description } = validationResult.data;
    const slug = slugify(name);

    const newProject = await prisma.project.create({
      data: {
        name,
        slug,
        description: description || null,
      },
      include: {
        materials: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
        _count: {
          select: {
            materials: true,
          },
        },
      },
    });

    const formattedProject = {
      id: newProject.id,
      slug: newProject.slug,
      name: newProject.name,
      description: newProject.description,
      _count: newProject._count,
      createdAt: newProject.createdAt,
      updatedAt: newProject.updatedAt,
    };

    return NextResponse.json(formattedProject, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating project:', error);
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'P2002' &&
      'meta' in error &&
      error.meta &&
      typeof error.meta === 'object' &&
      'target' in error.meta &&
      constraintTargetIncludes((error.meta as { target?: unknown }).target, 'slug')
    ) {
      return NextResponse.json(
        { error: 'Failed to create project: Slug already exists. Please change the name.' },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
