import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

// slugify関数（materialsのAPIから流用）
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, '') // Remove all non-word chars
    .replace(/--+/g, '-'); // Replace multiple - with single -
}

// Next.js 15.3.3 の新しい型定義
type RouteContext = {
  params: Promise<{ id: string }>;
}

// タグ更新時のバリデーションスキーマ
const UpdateTagSchema = z.object({
  name: z.string().min(1).max(50).trim(),
});

// GET /api/master/tags/[id] - 特定のタグ取得
export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  try {
    const tag = await prisma.tag.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            materials: true, // 関連する素材数をカウント
          },
        },
      },
    });
    
    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }
    
    return NextResponse.json(tag);
  } catch (error) {
    console.error(`Error fetching tag ${id}:`, error);
    return NextResponse.json(
      { error: `Failed to fetch tag ${id}` },
      { status: 500 }
    );
  }
}

// PUT /api/master/tags/[id] - 特定のタグ更新（リネーム）
export async function PUT(request: Request, { params }: RouteContext) {
  const { id } = await params;
  try {
    const body = await request.json();
    
    const validationResult = UpdateTagSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { name } = validationResult.data;
    const slug = slugify(name);

    const updatedTag = await prisma.tag.update({
      where: { id },
      data: {
        name,
        slug,
        updatedAt: new Date(),
      },
      include: {
        _count: {
          select: {
            materials: true,
          },
        },
      },
    });
    
    return NextResponse.json(updatedTag);
  } catch (error) {
    console.error(`Error updating tag ${id}:`, error);
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = error.meta?.target;
        let conflictField = 'unknown';
        
        if (typeof target === 'string') {
          conflictField = target;
        } else if (Array.isArray(target)) {
          if (target.includes('name')) conflictField = 'name';
          else if (target.includes('slug')) conflictField = 'slug';
        }
        
        return NextResponse.json(
          { error: `Tag with this ${conflictField} already exists` },
          { status: 409 }
        );
      }
      
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: `Tag with id ${id} not found` },
          { status: 404 }
        );
      }
    }
    
    return NextResponse.json(
      { error: `Failed to update tag ${id}` },
      { status: 500 }
    );
  }
}

// DELETE /api/master/tags/[id] - 特定のタグ削除
export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  try {
    // まず、このタグに関連付けられた素材があるかチェック
    const tagWithMaterials = await prisma.tag.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            materials: true,
          },
        },
      },
    });

    if (!tagWithMaterials) {
      return NextResponse.json(
        { error: `Tag with id ${id} not found` },
        { status: 404 }
      );
    }

    // 関連する素材がある場合は削除を拒否
    if (tagWithMaterials._count.materials > 0) {
      return NextResponse.json(
        { 
          error: `Cannot delete tag: ${tagWithMaterials._count.materials} material(s) are still using this tag`,
          materialCount: tagWithMaterials._count.materials
        },
        { status: 409 } // Conflict
      );
    }

    // 関連する素材がない場合のみ削除を実行
    await prisma.tag.delete({
      where: { id },
    });
    
    return NextResponse.json(
      { message: 'Tag deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error(`Error deleting tag ${id}:`, error);
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: `Tag with id ${id} not found` },
          { status: 404 }
        );
      }
    }
    
    return NextResponse.json(
      { error: `Failed to delete tag ${id}` },
      { status: 500 }
    );
  }
}