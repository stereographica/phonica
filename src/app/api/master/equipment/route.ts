import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client'; // PrismaClientKnownRequestError をインポート
import { ERROR_MESSAGES } from '@/lib/error-messages';
import { constraintTargetIncludes } from '@/lib/utils/prisma-error';

// GET /api/master/equipment - 機材一覧取得
export async function GET() {
  try {
    const equipments = await prisma.equipment.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(equipments);
  } catch (error) {
    console.error('Error fetching equipments:', error);
    return NextResponse.json({ error: 'Failed to fetch equipments' }, { status: 500 });
  }
}

// POST /api/master/equipment - 機材新規作成
export async function POST(request: Request) {
  try {
    const body = await request.json();
    // スキーマに合わせてフィールド名を修正
    const { name, type, manufacturer, memo } = body;

    if (!name || !type) {
      // type も必須と仮定（スキーマ上は必須）
      return NextResponse.json({ error: ERROR_MESSAGES.REQUIRED_FIELD_MISSING }, { status: 400 });
    }

    const newEquipment = await prisma.equipment.create({
      data: {
        name,
        type,
        manufacturer,
        memo,
      },
    });
    return NextResponse.json(newEquipment, { status: 201 });
  } catch (error) {
    console.error('Error creating equipment:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002' && constraintTargetIncludes(error.meta?.target, 'name')) {
        return NextResponse.json(
          { error: ERROR_MESSAGES.EQUIPMENT_NAME_EXISTS },
          { status: 409 }, // Conflict
        );
      }
    }
    return NextResponse.json({ error: ERROR_MESSAGES.DATABASE_ERROR }, { status: 500 });
  }
}
