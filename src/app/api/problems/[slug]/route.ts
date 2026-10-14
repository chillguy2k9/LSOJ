import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  try {
    const { searchParams } = new URL(req.url);
    const includeAll = searchParams.get('includeAll') === 'true';

    const problem = await prisma.problem.findUnique({
      where: { slug: params.slug },
      include: {
        testcases: {
          where: includeAll ? undefined : { isSample: true },
          orderBy: { order: 'asc' },
          select: {
            id: true,
            input: true,
            output: true,
            isSample: true,
            explanation: true,
            order: true,
          },
        },
        _count: {
          select: {
            testcases: true,
            submissions: true,
          },
        },
      },
    });

    if (!problem) {
      return NextResponse.json({ error: 'Không tìm thấy bài tập!' }, { status: 404 });
    }

    return NextResponse.json(problem, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
