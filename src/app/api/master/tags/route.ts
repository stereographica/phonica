import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { generateUniqueSlug } from '@/lib/slug-generator';
import { ERROR_MESSAGES } from '@/lib/error-messages';

// クエリパラメータのバリデーションスキーマ
const GetTagsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50), // タグは比較的数が少ないので多めに
  sortBy: z.enum(['name', 'createdAt', 'updatedAt']).optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  name: z.string().optional(), // タグ名による部分検索
});

// タグ作成時のバリデーションスキーマ
const CreateTagSchema = z.object({
  name: z.string().min(1).max(50).trim(),
});

// GET /api/master/tags - タグ一覧取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams);

    const validationResult = GetTagsQuerySchema.safeParse(queryParams);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validationResult.error.flatten() },
        { status: 400 },
      );
    }

    const { page, limit, sortBy, sortOrder, name } = validationResult.data;
    const skip = (page - 1) * limit;

    // 検索条件を構築
    const where: Prisma.TagWhereInput = {};
    if (name) {
      where.name = {
        contains: name,
        mode: 'insensitive', // 大文字小文字を区別しない
      };
    }

    // ソート条件を構築
    const orderBy: Prisma.TagOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    // タグ一覧取得（素材数も含める）
    const [tags, totalCount] = await Promise.all([
      prisma.tag.findMany({
        where,
        include: {
          _count: {
            select: {
              materials: true, // 関連する素材数をカウント
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.tag.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      tags,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
}

// POST /api/master/tags - タグ新規作成
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const validationResult = CreateTagSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 },
      );
    }

    const { name } = validationResult.data;
    const slug = await generateUniqueSlug(name, 'tag');

    const newTag = await prisma.tag.create({
      data: {
        name,
        slug,
      },
      include: {
        _count: {
          select: {
            materials: true,
          },
        },
      },
    });

    return NextResponse.json(newTag, { status: 201 });
  } catch (error) {
    console.error('Error creating tag:', error);

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

        if (conflictField === 'name') {
          return NextResponse.json({ error: ERROR_MESSAGES.TAG_NAME_EXISTS }, { status: 409 });
        } else {
          // slug conflict shouldn't happen with generateUniqueSlug
          return NextResponse.json(
            { error: 'Slugの生成に失敗しました。もう一度お試しください。' },
            { status: 409 },
          );
        }
      }
    }

    return NextResponse.json({ error: ERROR_MESSAGES.DATABASE_ERROR }, { status: 500 });
  }
}
