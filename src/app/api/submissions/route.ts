import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const problemId = searchParams.get('problemId');
    const slug = searchParams.get('slug');
    const username = searchParams.get('username');
    const exactUsername = searchParams.get('exactUsername');
    const verdict = searchParams.get('verdict');
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 100);

    const where: any = {};
    if (problemId) {
      where.problemId = problemId;
    } else if (slug) {
      where.problem = { slug };
    }
    if (exactUsername) {
      where.username = exactUsername;
    } else if (username) {
      where.username = { contains: username, mode: 'insensitive' };
    }
    if (verdict && verdict !== 'ALL') {
      where.verdict = verdict;
    }

    const submissions = await prisma.submission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        problem: {
          select: {
            id: true,
            slug: true,
            title: true,
          },
        },
      },
    });

    const parsedSubmissions = submissions.map((sub) => {
      let testResults = null;
      if (sub.testResults) {
        try {
          testResults = JSON.parse(sub.testResults);
        } catch {
          testResults = null;
        }
      }
      return {
        ...sub,
        testResults,
      };
    });

    return NextResponse.json(parsedSubmissions);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
