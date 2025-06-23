import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { markFileForDeletion, deleteFile } from '@/lib/file-system';
import path from 'path';

const BulkDeleteSchema = z.object({
  materialIds: z.array(z.string()).min(1, 'At least one material ID is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedBody = BulkDeleteSchema.safeParse(body);

    if (!validatedBody.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validatedBody.error.flatten() },
        { status: 400 },
      );
    }

    const { materialIds } = validatedBody.data;

    // Verify all materials exist
    const materials = await prisma.material.findMany({
      where: { id: { in: materialIds } },
      select: { id: true, title: true, filePath: true },
    });

    const foundIds = materials.map((m) => m.id);
    const notFoundIds = materialIds.filter((id) => !foundIds.includes(id));

    if (notFoundIds.length > 0) {
      return NextResponse.json(
        { error: `Materials not found: ${notFoundIds.join(', ')}` },
        { status: 404 },
      );
    }

    const uploadsBaseDir = path.join(process.cwd(), 'public', 'uploads', 'materials');
    const markedFiles: { materialId: string; filePath: string }[] = [];

    // Mark all files for deletion
    for (const material of materials) {
      if (material.filePath) {
        const fullPath = path.join(uploadsBaseDir, material.filePath);
        try {
          await markFileForDeletion(fullPath);
          markedFiles.push({ materialId: material.id, filePath: fullPath });
        } catch (error) {
          console.warn(`Failed to mark file for deletion: ${material.filePath}`, error);
        }
      }
    }

    try {
      // Delete materials in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // For each material, disconnect all relations before deletion
        for (const materialId of materialIds) {
          await tx.material.update({
            where: { id: materialId },
            data: {
              tags: { set: [] },
              equipments: { set: [] },
              projects: { set: [] },
            },
          });
        }

        // Now delete the materials
        await tx.material.deleteMany({
          where: { id: { in: materialIds } },
        });

        return { deletedCount: materialIds.length };
      });

      // After successful database deletion, delete the files
      for (const { materialId, filePath } of markedFiles) {
        try {
          await deleteFile(filePath, {
            allowedBaseDir: uploadsBaseDir,
            materialId,
            skipValidation: true,
          });
        } catch (error) {
          console.error(`Failed to delete file: ${filePath}`, error);
        }
      }

      return NextResponse.json({
        success: true,
        deletedCount: result.deletedCount,
        deletedMaterials: materials.map((m) => ({ id: m.id, title: m.title })),
      });
    } catch (error) {
      // If transaction fails, unmark the files
      for (const { filePath } of markedFiles) {
        try {
          const { unmarkFileForDeletion } = await import('@/lib/file-system');
          await unmarkFileForDeletion(filePath);
        } catch (unmarkerror) {
          console.warn(`Failed to unmark file: ${filePath}`, unmarkerror);
        }
      }

      throw error;
    }
  } catch (error) {
    console.error('Failed to bulk delete materials:', error);

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
