import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const BulkTagsSchema = z.object({
  materialIds: z.array(z.string()).min(1, 'At least one material ID is required'),
  tagIds: z.array(z.string()).min(1, 'At least one tag ID is required'),
  mode: z.enum(['add', 'replace']).default('add'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedBody = BulkTagsSchema.safeParse(body);

    if (!validatedBody.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validatedBody.error.flatten() },
        { status: 400 },
      );
    }

    const { materialIds, tagIds, mode } = validatedBody.data;

    // Verify all materials exist
    const materials = await prisma.material.findMany({
      where: { id: { in: materialIds } },
      select: { id: true },
    });

    const foundMaterialIds = materials.map((m) => m.id);
    const notFoundMaterialIds = materialIds.filter((id) => !foundMaterialIds.includes(id));

    if (notFoundMaterialIds.length > 0) {
      return NextResponse.json(
        { error: `Materials not found: ${notFoundMaterialIds.join(', ')}` },
        { status: 404 },
      );
    }

    // Verify all tags exist
    const tags = await prisma.tag.findMany({
      where: { id: { in: tagIds } },
      select: { id: true, name: true },
    });

    const foundTagIds = tags.map((t) => t.id);
    const notFoundTagIds = tagIds.filter((id) => !foundTagIds.includes(id));

    if (notFoundTagIds.length > 0) {
      return NextResponse.json(
        { error: `Tags not found: ${notFoundTagIds.join(', ')}` },
        { status: 404 },
      );
    }

    // Perform bulk update in a transaction
    const result = await prisma.$transaction(async (tx) => {
      for (const materialId of materialIds) {
        if (mode === 'replace') {
          // Replace all tags for this material
          await tx.material.update({
            where: { id: materialId },
            data: {
              tags: {
                set: tagIds.map((tagId) => ({ id: tagId })),
              },
            },
          });
        } else {
          // Add mode: get existing tags and add new ones
          const material = await tx.material.findUnique({
            where: { id: materialId },
            include: { tags: true },
          });

          const existingTagIds = material?.tags.map((tag) => tag.id) || [];
          const newTagIds = tagIds.filter((tagId) => !existingTagIds.includes(tagId));

          if (newTagIds.length > 0) {
            await tx.material.update({
              where: { id: materialId },
              data: {
                tags: {
                  connect: newTagIds.map((tagId) => ({ id: tagId })),
                },
              },
            });
          }
        }
      }

      // Get updated material count for each tag
      const tagCounts = await Promise.all(
        tagIds.map(async (tagId: string) => {
          const count = await tx.material.count({
            where: {
              tags: {
                some: { id: tagId },
              },
            },
          });
          const tag = tags.find((t) => t.id === tagId);
          return { tagId, tagName: tag?.name || '', count };
        }),
      );

      return {
        affectedMaterials: materialIds.length,
        mode,
        tags: tagCounts,
      };
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Failed to bulk update tags:', error);

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
