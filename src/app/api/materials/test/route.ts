import { NextRequest, NextResponse } from 'next/server';
import { createMaterialForTest } from '@/lib/actions/materials';

export async function POST(request: NextRequest) {
  // テスト環境でのみ有効
  if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in test/development environment' },
      { status: 403 }
    );
  }

  try {
    const data = await request.json();
    const result = await createMaterialForTest(data);
    
    if (result.success) {
      return NextResponse.json(result.data, { status: 201 });
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in test endpoint:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create test material' },
      { status: 500 }
    );
  }
}