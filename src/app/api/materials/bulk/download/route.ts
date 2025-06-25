import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { scheduleZipGeneration, getZipGenerationStatus } from '@/lib/queue/zip-generation-queue';

const BulkDownloadSchema = z.object({
  materialIds: z.array(z.string()).min(1, 'At least one material ID is required'),
});

const StatusQuerySchema = z.object({
  requestId: z.string().min(1, 'Request ID is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedBody = BulkDownloadSchema.safeParse(body);

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
      select: { id: true, title: true },
    });

    const foundIds = materials.map((m) => m.id);
    const notFoundIds = materialIds.filter((id) => !foundIds.includes(id));

    if (notFoundIds.length > 0) {
      return NextResponse.json(
        { error: `Materials not found: ${notFoundIds.join(', ')}` },
        { status: 404 },
      );
    }

    // Schedule ZIP generation
    const requestId = await scheduleZipGeneration(materialIds);

    if (!requestId) {
      return NextResponse.json(
        { error: 'Failed to schedule ZIP generation. Background service may be unavailable.' },
        { status: 503 },
      );
    }

    return NextResponse.json({
      success: true,
      requestId,
      materialCount: materials.length,
      message: 'ZIP generation has been scheduled. Use the request ID to check the status.',
      statusUrl: `/api/materials/bulk/download/status?requestId=${requestId}`,
    });
  } catch (error) {
    console.error('Failed to schedule bulk download:', error);

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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const requestId = searchParams.get('requestId');

    const validated = StatusQuerySchema.safeParse({ requestId });

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validated.error.flatten() },
        { status: 400 },
      );
    }

    const status = await getZipGenerationStatus(validated.data.requestId);

    if (!status) {
      return NextResponse.json({ error: 'Request ID not found' }, { status: 404 });
    }

    return NextResponse.json({
      requestId: validated.data.requestId,
      ...status,
    });
  } catch (error) {
    console.error('Failed to get download status:', error);

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
