import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { executeSingleTest } from '@/lib/piston';
import { SUPPORTED_LANGUAGES } from '@/lib/constants';
import { Verdict, SingleTestResult } from '@/types';

export async function POST(req: Request) {
  try {
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

    const testResults: SingleTestResult[] = [];
    let passedCount = 0;
    let maxTime = 0;
    let maxMemory = 0;
    let finalVerdict: Verdict = 'AC';
    let compileErrorMsg: string | null = null;
    let runtimeErrorMsg: string | null = null;

    // Chấm từng test case
    for (let i = 0; i < problem.testcases.length; i++) {
      const tc = problem.testcases[i];

      const res = await executeSingleTest({
        sourceCode,
        languageId: Number(languageId),
        testIndex: i + 1,
        input: tc.input,
        expectedOutput: tc.output,
        isSample: tc.isSample,
        timeLimitMs: problem.timeLimit,
        memoryLimitKb: problem.memoryLimit,
      });

      if (res.time && res.time > maxTime) maxTime = res.time;
      if (res.memory && res.memory > maxMemory) maxMemory = res.memory;

      // Lưu đầy đủ thông tin testcase (kể cả Hidden Tests) để người dùng có thể xem lại sau khi nộp
      const testResultItem: SingleTestResult = {
        testIndex: i + 1,
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

      testResults.push(testResultItem);

      if (res.verdict === 'AC') {
        passedCount++;
      } else {
        // Ghi nhận lỗi đầu tiên
        if (finalVerdict === 'AC') {
          finalVerdict = res.verdict;
        }

        if (res.verdict === 'CE') {
          compileErrorMsg = res.error || 'Compile error';
          // Dừng ngay lập tức nếu lỗi biên dịch
          break;
        } else if (res.verdict === 'RTE' && !runtimeErrorMsg) {
          runtimeErrorMsg = res.error || 'Runtime error';
        }
      }
    }

    // Nếu không vượt qua hết và finalVerdict chưa đổi (trường hợp hiếm)
    if (passedCount !== problem.testcases.length && finalVerdict === 'AC') {
      finalVerdict = 'WA';
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
