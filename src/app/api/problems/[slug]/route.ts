import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  try {
    const { searchParams } = new URL(req.url);
    const includeAll = searchParams.get('includeAll') === 'true';
    const username = searchParams.get('username') || '';

    // Kiểm tra xem thí sinh này đã giải được bài tập (đạt AC) chưa
    let hasAC = false;
    if (username) {
      const acSubmission = await prisma.submission.findFirst({
        where: {
          problem: { slug: params.slug },
          username: username,
          verdict: 'AC',
        },
        select: { id: true },
      });
      hasAC = Boolean(acSubmission);
    }

    // Chỉ cho phép tải toàn bộ testcases (bao gồm test ẩn) nếu includeAll = true VÀ thí sinh đã đạt AC
    const shouldLoadAll = includeAll && hasAC;

    const problem = await prisma.problem.findUnique({
      where: { slug: params.slug },
      include: {
        testcases: {
          where: shouldLoadAll ? undefined : { isSample: true },
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

    return NextResponse.json(
      {
        ...problem,
        hasAC,
        canViewHiddenTests: hasAC,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
