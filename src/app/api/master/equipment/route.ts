import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client'; // PrismaClientKnownRequestError をインポート

// GET /api/master/equipment - 機材一覧取得
export async function GET() {
  try {
    const equipments = await prisma.equipment.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(equipments);
  } catch (error) {
    console.error("Error fetching equipments:", error);
    return NextResponse.json(
      { error: "Failed to fetch equipments" },
      { status: 500 }
    );
  }
}

// POST /api/master/equipment - 機材新規作成
export async function POST(request: Request) {
  try {
    const body = await request.json();
    // スキーマに合わせてフィールド名を修正
    const { name, type, manufacturer, memo } = body;

    if (!name || !type) { // type も必須と仮定（スキーマ上は必須）
      return NextResponse.json(
        { error: 'Missing required fields: name, type' },
        { status: 400 }
      );
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
    console.error("Error creating equipment:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // P2002はユニーク制約違反
      // error.meta.target can be a string or string[]
      const target = error.meta?.target;
      let isNameConflict = false;
      if (typeof target === 'string') {
        isNameConflict = target === 'name';
      } else if (Array.isArray(target)) {
        isNameConflict = target.includes('name');
      }

      if (error.code === 'P2002' && isNameConflict) {
        return NextResponse.json(
          { error: 'Failed to create equipment: Name already exists.' },
          { status: 409 } // Conflict
        );
      }
    }
    return NextResponse.json(
      { error: "Failed to create equipment" },
      { status: 500 }
    );
  }
} 
