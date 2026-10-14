import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { executeSingleTest, executeWithPiston, executeBatchTestsWithPiston } from '@/lib/piston';
import { Verdict } from '@/types';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export async function POST(req: Request) {
  try {
    const clientIp = getClientIp(req);
    const rateCheck = checkRateLimit(`run:${clientIp}`, 2, 2000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Thao tác quá nhanh! Vui lòng đợi ${rateCheck.retryAfterSeconds}s trước khi chạy tiếp.` },
        { status: 429 }
      );
    }

    const { problemId, languageId, sourceCode, customInput } = await req.json();

    if (!problemId || !languageId || !sourceCode) {
      return NextResponse.json({ error: 'Thiếu thông tin bài tập, ngôn ngữ hoặc mã nguồn!' }, { status: 400 });
    }

    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      include: {
        testcases: {
          where: { isSample: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!problem) {
      return NextResponse.json({ error: 'Bài tập không tồn tại!' }, { status: 404 });
    }

    // Trường hợp 1: Chạy với Custom Input trực tiếp qua Piston API
    if (typeof customInput === 'string' && customInput.length > 0) {
      try {
        const result = await executeWithPiston({
          sourceCode,
          languageId: Number(languageId),
          stdin: customInput,
          timeLimitMs: problem.timeLimit,
        });

        let verdict: Verdict = 'AC';
        if (result.isCompileError) {
          verdict = 'CE';
        } else if (result.signal === 'SIGKILL' || result.signal === 'SIGXCPU') {
          verdict = 'TLE';
        } else if (result.code !== 0) {
          verdict = 'RTE';
        }

        return NextResponse.json({
          mode: 'custom',
          verdict,
          stdout: result.stdout,
          time: result.timeTaken,
          memory: Math.round(problem.memoryLimit / 8),
          error: result.compileOutput || result.stderr || null,
          input: customInput,
        });
      } catch (err: any) {
        return NextResponse.json({
          mode: 'custom',
          verdict: 'RTE',
          stdout: '',
          time: 0,
          memory: 0,
          error: err.message || 'Lỗi khi chạy custom input qua Piston API',
          input: customInput,
        });
      }
    }

    // Trường hợp 2: Chạy với Sample Testcases
    if (problem.testcases.length === 0) {
      return NextResponse.json({ error: 'Bài tập này chưa có Sample Test nào!' }, { status: 400 });
    }

    const isBatchSupported = Number(languageId) === 54 || Number(languageId) === 71;
    let sampleResults: any[] = [];
    let usedBatch = false;

    if (isBatchSupported) {
      try {
        const batchRes = await executeBatchTestsWithPiston({
          sourceCode,
          languageId: Number(languageId),
          testcases: problem.testcases.map((tc, idx) => ({
            testIndex: idx + 1,
            input: tc.input,
            expectedOutput: tc.output,
            isSample: true,
            explanation: tc.explanation,
          })),
          timeLimitMs: problem.timeLimit,
          memoryLimitKb: problem.memoryLimit,
        });

        if (batchRes.isCompileError) {
          sampleResults = [
            {
              testIndex: 1,
              isSample: true,
              verdict: 'CE',
              time: 0,
              memory: 0,
              error: batchRes.compileErrorMsg || 'Compile error',
              input: problem.testcases[0].input,
              expectedOutput: problem.testcases[0].output,
            },
          ];
        } else {
          sampleResults = batchRes.testResults;
        }
        usedBatch = true;
      } catch (err) {
        console.warn('Run sample batch failed, falling back to parallel:', err);
        usedBatch = false;
      }
    }

    if (!usedBatch) {
      const firstTc = problem.testcases[0];
      const firstRes = await executeSingleTest({
        sourceCode,
        languageId: Number(languageId),
        testIndex: 1,
        input: firstTc.input,
        expectedOutput: firstTc.output,
        isSample: true,
        timeLimitMs: problem.timeLimit,
        memoryLimitKb: problem.memoryLimit,
      });

      sampleResults = [
        {
          ...firstRes,
          explanation: firstTc.explanation,
        },
      ];

      // Nếu test 1 không bị CE và còn các sample test khác, chạy song song cùng lúc
      if (firstRes.verdict !== 'CE' && problem.testcases.length > 1) {
        const remainingTestcases = problem.testcases.slice(1);
        const remainingResults = await Promise.all(
          remainingTestcases.map((tc, idx) =>
            executeSingleTest({
              sourceCode,
              languageId: Number(languageId),
              testIndex: idx + 2,
              input: tc.input,
              expectedOutput: tc.output,
              isSample: true,
              timeLimitMs: problem.timeLimit,
              memoryLimitKb: problem.memoryLimit,
            }).then((res) => ({
              ...res,
              explanation: tc.explanation,
            }))
          )
        );
        sampleResults.push(...remainingResults);
      }
    }

    const allPassed = sampleResults.every((r) => r.verdict === 'AC');
    const firstFailing = sampleResults.find((r) => r.verdict !== 'AC');

    return NextResponse.json({
      mode: 'sample',
      overallVerdict: allPassed ? 'AC' : (firstFailing?.verdict || 'WA'),
      results: sampleResults,
    });
  } catch (error: any) {
    console.error('Lỗi khi chạy Run Sample:', error);
    return NextResponse.json({ error: error.message || 'Lỗi xử lý Run' }, { status: 500 });
  }
}
