import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { constraintTargetIncludes } from '@/lib/utils/prisma-error';

// Next.js 15.3.3 の新しい型定義
type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/master/equipment/[id] - 特定の機材取得
export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  try {
    const equipment = await prisma.equipment.findUnique({
      where: { id },
    });
    if (!equipment) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });
    }
    return NextResponse.json(equipment);
  } catch (error) {
    console.error(`Error fetching equipment ${id}:`, error);
    return NextResponse.json({ error: `Failed to fetch equipment ${id}` }, { status: 500 });
  }
}

// PUT /api/master/equipment/[id] - 特定の機材更新
export async function PUT(request: Request, { params }: RouteContext) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { name, type, manufacturer, memo } = body;

    if (!name || !type) {
      // type も必須と仮定
      return NextResponse.json({ error: 'Missing required fields: name, type' }, { status: 400 });
    }

    const updatedEquipment = await prisma.equipment.update({
      where: { id },
      data: {
        name,
        type,
        manufacturer,
        memo,
        updatedAt: new Date(), // updatedAt を手動で更新
      },
    });
    return NextResponse.json(updatedEquipment);
  } catch (error) {
    console.error(`Error updating equipment ${id}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002' && constraintTargetIncludes(error.meta?.target, 'name')) {
        return NextResponse.json(
          { error: 'Failed to update equipment: Name already exists.' },
          { status: 409 },
        );
      }
      // P2025は対象レコードが見つからない場合のエラー
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: `Failed to update equipment: Equipment with id ${id} not found.` },
          { status: 404 },
        );
      }
    }
    return NextResponse.json({ error: `Failed to update equipment ${id}` }, { status: 500 });
  }
}

// DELETE /api/master/equipment/[id] - 特定の機材削除
export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  try {
    await prisma.equipment.delete({
      where: { id },
    });
    return NextResponse.json({ message: 'Equipment deleted successfully' }, { status: 200 }); // 成功時は200 or 204
  } catch (error) {
    console.error(`Error deleting equipment ${id}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // P2025は対象レコードが見つからない場合のエラー
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: `Failed to delete equipment: Equipment with id ${id} not found.` },
          { status: 404 },
        );
      }
    }
    return NextResponse.json({ error: `Failed to delete equipment ${id}` }, { status: 500 });
  }
}
