import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { executeSingleTest, executeBatchTestsWithPiston } from '@/lib/piston';
import { SUPPORTED_LANGUAGES } from '@/lib/constants';
import { Verdict, SingleTestResult } from '@/types';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export async function POST(req: Request) {
  try {
    const clientIp = getClientIp(req);
    const rateCheck = checkRateLimit(`submit:${clientIp}`, 2, 2500);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Thao tác nộp bài quá nhanh! Vui lòng đợi ${rateCheck.retryAfterSeconds}s trước khi nộp tiếp.` },
        { status: 429 }
      );
    }

    const { problemId, languageId, sourceCode, username } = await req.json();

    const cleanedUsername = (username || '').trim();
    if (!cleanedUsername) {
      return NextResponse.json(
        { error: 'Vui lòng nhập tên thí sinh (username) trước khi nộp bài chấm!' },
        { status: 400 }
      );
    }

    if (!problemId || !languageId || !sourceCode) {
      return NextResponse.json({ error: 'Thiếu thông tin bài tập, ngôn ngữ hoặc mã nguồn!' }, { status: 400 });
    }

    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      include: {
        testcases: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!problem) {
      return NextResponse.json({ error: 'Bài tập không tồn tại!' }, { status: 404 });
    }

    if (problem.testcases.length === 0) {
      return NextResponse.json({ error: 'Bài tập này chưa có testcases nào để chấm!' }, { status: 400 });
    }

    const langConfig = SUPPORTED_LANGUAGES.find((l) => l.id === Number(languageId));
    const languageName = langConfig ? langConfig.name : `Lang-${languageId}`;

    // Tạo bản ghi Submission ban đầu
    const submission = await prisma.submission.create({
      data: {
        problemId: problem.id,
        username: cleanedUsername,
        languageId: Number(languageId),
        language: languageName,
        code: sourceCode,
        status: 'PROCESSING',
        verdict: 'Processing',
        totalTests: problem.testcases.length,
        passedTests: 0,
      },
    });

    let testResults: SingleTestResult[] = [];
    let passedCount = 0;
    let maxTime = 0;
    let maxMemory = 0;
    let finalVerdict: Verdict = 'AC';
    let compileErrorMsg: string | null = null;
    let runtimeErrorMsg: string | null = null;

    // Chế độ 1: Single-Compile Batch Runner (Chỉ biên dịch 1 lần duy nhất cho toàn bộ bài thi)
    const isBatchSupported = Number(languageId) === 54 || Number(languageId) === 71;
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
            isSample: tc.isSample,
            explanation: tc.explanation,
          })),
          timeLimitMs: problem.timeLimit,
          memoryLimitKb: problem.memoryLimit,
        });

        if (batchRes.isCompileError) {
          finalVerdict = 'CE';
          compileErrorMsg = batchRes.compileErrorMsg || 'Compile error';
          testResults = [];
        } else {
          testResults = batchRes.testResults;
          for (const res of testResults) {
            if (res.time && res.time > maxTime) maxTime = res.time;
            if (res.memory && res.memory > maxMemory) maxMemory = res.memory;

            if (res.verdict === 'AC') {
              passedCount++;
            } else {
              if (finalVerdict === 'AC') {
                finalVerdict = res.verdict;
              }
              if (res.verdict === 'RTE' && !runtimeErrorMsg) {
                runtimeErrorMsg = res.error || 'Runtime error';
              }
            }
          }

          if (passedCount !== problem.testcases.length && finalVerdict === 'AC') {
            finalVerdict = 'WA';
          }
        }
        usedBatch = true;
      } catch (batchErr) {
        console.warn('Batch single-compile failed, falling back to parallel runner:', batchErr);
        usedBatch = false;
      }
    }

    // Chế độ 2: Dự phòng Smart Parallel Runner
    if (!usedBatch) {
      const firstTc = problem.testcases[0];
      const firstRes = await executeSingleTest({
        sourceCode,
        languageId: Number(languageId),
        testIndex: 1,
        input: firstTc.input,
        expectedOutput: firstTc.output,
        isSample: firstTc.isSample,
        timeLimitMs: problem.timeLimit,
        memoryLimitKb: problem.memoryLimit,
      });

      testResults.push({
        testIndex: 1,
        isSample: firstTc.isSample,
        verdict: firstRes.verdict,
        time: firstRes.time,
        memory: firstRes.memory,
        input: firstTc.input,
        stdout: firstRes.stdout,
        expectedOutput: firstTc.output,
        explanation: firstTc.explanation || undefined,
        error: firstRes.error,
      });

      if (firstRes.verdict === 'CE') {
        compileErrorMsg = firstRes.error || 'Compile error';
        finalVerdict = 'CE';
      } else {
        const remainingTestcases = problem.testcases.slice(1);
        if (remainingTestcases.length > 0) {
          const CONCURRENCY_LIMIT = 4;
          const remainingResults: SingleTestResult[] = new Array(remainingTestcases.length);
          let currentIndex = 0;

          const workers = Array.from(
            { length: Math.min(CONCURRENCY_LIMIT, remainingTestcases.length) },
            async () => {
              while (currentIndex < remainingTestcases.length) {
                const idx = currentIndex++;
                const tc = remainingTestcases[idx];
                const testNum = idx + 2;

                const res = await executeSingleTest({
                  sourceCode,
                  languageId: Number(languageId),
                  testIndex: testNum,
                  input: tc.input,
                  expectedOutput: tc.output,
                  isSample: tc.isSample,
                  timeLimitMs: problem.timeLimit,
                  memoryLimitKb: problem.memoryLimit,
                });

                remainingResults[idx] = {
                  testIndex: testNum,
                  isSample: tc.isSample,
                  verdict: res.verdict,
                  time: res.time,
                  memory: res.memory,
                  input: tc.input,
                  stdout: res.stdout,
                  expectedOutput: tc.output,
                  explanation: tc.explanation || undefined,
                  error: res.error,
                };
              }
            }
          );

          await Promise.all(workers);
          testResults.push(...remainingResults);
        }

        for (const res of testResults) {
          if (res.time && res.time > maxTime) maxTime = res.time;
          if (res.memory && res.memory > maxMemory) maxMemory = res.memory;

          if (res.verdict === 'AC') {
            passedCount++;
          } else {
            if (finalVerdict === 'AC') {
              finalVerdict = res.verdict;
            }
            if (res.verdict === 'RTE' && !runtimeErrorMsg) {
              runtimeErrorMsg = res.error || 'Runtime error';
            }
          }
        }

        if (passedCount !== problem.testcases.length && finalVerdict === 'AC') {
          finalVerdict = 'WA';
        }
      }
    }

    // Cập nhật kết quả vào database
    const updatedSubmission = await prisma.submission.update({
      where: { id: submission.id },
      data: {
        status: finalVerdict === 'AC' ? 'ACCEPTED' : finalVerdict,
        verdict: finalVerdict,
        passedTests: passedCount,
        totalTests: problem.testcases.length,
        time: maxTime,
        memory: maxMemory,
        compileOutput: compileErrorMsg,
        stderr: runtimeErrorMsg,
        testResults: JSON.stringify(testResults),
      },
      include: {
        problem: {
          select: { id: true, slug: true, title: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      submission: {
        ...updatedSubmission,
        testResults,
      },
    });
  } catch (error: any) {
    console.error('Lỗi khi nộp bài Submit:', error);
    return NextResponse.json({ error: error.message || 'Lỗi xử lý submission' }, { status: 500 });
  }
}
