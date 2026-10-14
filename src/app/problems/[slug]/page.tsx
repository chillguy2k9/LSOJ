'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import confetti from 'canvas-confetti';
import {
  SUPPORTED_LANGUAGES,
  DIFFICULTY_STYLES,
  VERDICT_CONFIG,
} from '@/lib/constants';
import { Difficulty, ProblemDTO, SubmissionDTO, Verdict, SingleTestResult } from '@/types';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import {
  Play,
  Send,
  RotateCcw,
  Copy,
  Check,
  Clock,
  HardDrive,
  FileCode,
  Terminal,
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  History,
  Maximize2,
  Minimize2,
  ChevronRight,
  User,
  Edit3,
  ArrowDownToLine,
  Filter,
  UploadCloud,
  X,
  FileUp,
} from 'lucide-react';

import CodeEditor from '@/components/CodeEditor';
import UsernameModal from '@/components/UsernameModal';
import { getStoredUsername, subscribeToUsername } from '@/lib/user';

export default function ProblemDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  // Data states
  const [problem, setProblem] = useState<ProblemDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Left panel tabs: 'description' | 'submissions'
  const [leftTab, setLeftTab] = useState<'description' | 'submissions'>('description');
  const [problemSubmissions, setProblemSubmissions] = useState<SubmissionDTO[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [submissionsFilter, setSubmissionsFilter] = useState<'mine' | 'all'>('mine');

  // Candidate / User state
  const [username, setUsername] = useState<string>('');
  const [isUsernameModalOpen, setIsUsernameModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Editor states
  const [selectedLang, setSelectedLang] = useState(SUPPORTED_LANGUAGES[0]);
  const [code, setCode] = useState(SUPPORTED_LANGUAGES[0].defaultCode);
  const [splitRatio, setSplitRatio] = useState(48); // % width for left panel
  const [copiedInputIdx, setCopiedInputIdx] = useState<number | null>(null);
  const [activeTestIdx, setActiveTestIdx] = useState<number>(0);
  const [showingAllTests, setShowingAllTests] = useState<boolean>(false);
  const [loadingAllTests, setLoadingAllTests] = useState<boolean>(false);

  // File Upload states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);

  // Bottom console states
  const [consoleTab, setConsoleTab] = useState<'sample' | 'custom' | 'result'>('sample');
  const [consoleExpanded, setConsoleExpanded] = useState<boolean>(false);
  const [customInput, setCustomInput] = useState('');
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [runResult, setRunResult] = useState<any>(null);
  const [submissionResult, setSubmissionResult] = useState<SubmissionDTO | null>(null);

  // Chuẩn hóa danh sách testcase cho console kết quả chấm
  const consoleTestResults = useMemo<SingleTestResult[]>(() => {
    if (!submissionResult || !submissionResult.testResults) return [];
    if (Array.isArray(submissionResult.testResults)) return submissionResult.testResults;
    if (typeof submissionResult.testResults === 'string') {
      try {
        return JSON.parse(submissionResult.testResults);
      } catch {
        return [];
      }
    }
    return [];
  }, [submissionResult]);

  // Load username & subscribe to changes
  useEffect(() => {
    setMounted(true);
    setUsername(getStoredUsername());
    const unsub = subscribeToUsername((name) => {
      setUsername(name);
    });
    return unsub;
  }, []);

  // Load problem details
  useEffect(() => {
    fetchProblem();
  }, [slug]);

  // Load submissions when switching to submissions tab or filter changes
  useEffect(() => {
    if (problem && leftTab === 'submissions') {
      fetchProblemSubmissions();
    }
  }, [problem?.id, leftTab, submissionsFilter, username]);

  const fetchProblem = async (includeAll = false) => {
    try {
      if (includeAll) {
        setLoadingAllTests(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const res = await fetch(`/api/problems/${slug}${includeAll ? '?includeAll=true' : ''}`, {
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new Error('Không tìm thấy bài tập!');
      }
      const data = await res.json();
      setProblem(data);
      if (includeAll) {
        setShowingAllTests(true);
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tải bài tập');
    } finally {
      setLoading(false);
      setLoadingAllTests(false);
    }
  };

  const fetchProblemSubmissions = async (filterMode = submissionsFilter) => {
    if (!problem) return;
    try {
      setLoadingSubmissions(true);
      const curUser = getStoredUsername();
      let url = `/api/submissions?problemId=${problem.id}&limit=30`;
      if (filterMode === 'mine' && curUser) {
        url += `&exactUsername=${encodeURIComponent(curUser)}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setProblemSubmissions(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  // Change language and reset to default template if editor hasn't been heavily altered
  const handleLanguageChange = (langId: number) => {
    const lang = SUPPORTED_LANGUAGES.find((l) => l.id === langId);
    if (!lang) return;
    setSelectedLang(lang);
    setCode(lang.defaultCode);
  };

  const handleResetCode = () => {
    if (confirm('Bạn có chắc muốn đặt lại mã nguồn về mẫu ban đầu?')) {
      setCode(selectedLang.defaultCode);
      setUploadedFileName(null);
    }
  };

  const processUploadedFile = (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      alert('Kích thước file mã nguồn vượt quá giới hạn cho phép (tối đa 2MB)!');
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase();

    // Tự động nhận diện ngôn ngữ lập trình dựa vào phần mở rộng file
    if (ext === 'cpp' || ext === 'cc' || ext === 'cxx' || ext === 'c') {
      const found = SUPPORTED_LANGUAGES.find((l) => l.monacoLang === 'cpp' || l.id === 54);
      if (found) setSelectedLang(found);
    } else if (ext === 'py' || ext === 'py3') {
      const found = SUPPORTED_LANGUAGES.find((l) => l.monacoLang === 'python' || l.id === 71);
      if (found) setSelectedLang(found);
    } else if (ext === 'java') {
      const found = SUPPORTED_LANGUAGES.find((l) => l.monacoLang === 'java' || l.id === 62);
      if (found) setSelectedLang(found);
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text !== undefined) {
        setCode(text);
        setUploadedFileName(`${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
      }
    };
    reader.readAsText(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processUploadedFile(file);
    e.target.value = '';
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedInputIdx(index);
    setTimeout(() => setCopiedInputIdx(null), 2000);
  };

  // Run Sample or Custom Input
  const handleRun = async () => {
    if (!problem || running || submitting) return;
    try {
      setRunning(true);
      setConsoleTab('result');
      setRunResult(null);
      setSubmissionResult(null);

      const payload: any = {
        problemId: problem.id,
        languageId: selectedLang.id,
        sourceCode: code,
      };

      if (consoleTab === 'custom' && customInput.trim()) {
        payload.customInput = customInput;
      }

      const res = await fetch('/api/judge/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Lỗi khi thực thi testcase');
      }

      setRunResult(data);

      if (data.overallVerdict === 'AC' || data.verdict === 'AC') {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
        });
      }
    } catch (err: any) {
      setRunResult({
        error: err.message,
        verdict: 'RTE',
      });
    } finally {
      setRunning(false);
    }
  };

  // Submit full evaluation
  const handleSubmit = async () => {
    if (!problem || running || submitting) return;

    // Yêu cầu bắt buộc: Chưa nhập tên thí sinh thì chưa thể chấm!
    const currentUsername = getStoredUsername();
    if (!currentUsername) {
      setIsUsernameModalOpen(true);
      return;
    }

    try {
      setSubmitting(true);
      setConsoleTab('result');
      setRunResult(null);
      setSubmissionResult(null);

      const res = await fetch('/api/judge/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemId: problem.id,
          languageId: selectedLang.id,
          sourceCode: code,
          username: currentUsername,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Lỗi khi gửi bài chấm');
      }

      setSubmissionResult(data.submission);
      const rawTests = data.submission.testResults;
      const testList = Array.isArray(rawTests) ? rawTests : [];
      const firstFailIdx = testList.findIndex((r: any) => r.verdict !== 'AC');
      setActiveTestIdx(firstFailIdx !== -1 ? firstFailIdx : 0);

      if (data.submission.verdict === 'AC') {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.7 },
        });
      }

      fetchProblemSubmissions();
    } catch (err: any) {
      setSubmissionResult({
        id: 'err',
        problemId: problem.id,
        languageId: selectedLang.id,
        language: selectedLang.name,
        code,
        status: 'ERROR',
        verdict: 'RTE',
        passedTests: 0,
        totalTests: 0,
        stderr: err.message,
        createdAt: new Date().toISOString(),
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0a0d14] text-slate-400">
        <div className="flex items-center space-x-3">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm">Đang tải đề bài & cấu hình...</span>
        </div>
      </div>
    );
  }

  if (error || !problem) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0a0d14] text-slate-400 p-4">
        <div className="bg-[#121824] border border-rose-500/30 rounded-xl p-6 max-w-md text-center">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white mb-2">Không tìm thấy bài tập</h2>
          <p className="text-xs text-slate-400 mb-4">{error || 'Bài tập này không tồn tại hoặc đã bị xóa.'}</p>
        </div>
      </div>
    );
  }

  const diffStyle = DIFFICULTY_STYLES[problem.difficulty as Difficulty] || DIFFICULTY_STYLES.EASY;

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-57px)] overflow-hidden bg-[#0a0d14]">
      {/* Top Problem Mini Header */}
      <div className="h-11 border-b border-slate-800 bg-[#0b0e15] px-4 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center space-x-3">
          <span className="font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2.5 py-0.5 rounded text-[11px] font-bold">
            LANG SON OJ
          </span>
          <span className="font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-[11px]">
            {problem.slug}
          </span>
          <span className="font-bold text-white truncate max-w-xs sm:max-w-md">
            {problem.title}
          </span>
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${diffStyle.badge}`}>
            {diffStyle.label}
          </span>
        </div>

        <div className="flex items-center space-x-4 text-slate-400 text-[11px]">
          <div className="flex items-center space-x-1 font-mono">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>{problem.timeLimit} ms</span>
          </div>
          <div className="flex items-center space-x-1 font-mono">
            <HardDrive className="w-3.5 h-3.5 text-slate-500" />
            <span>{Math.round(problem.memoryLimit / 1024)} MB</span>
          </div>
        </div>
      </div>

      {/* Main Split-Screen Workspace */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 h-full">
        {/* ================= LEFT PANEL: Problem Details / History ================= */}
        <div
          style={{ width: `${splitRatio}%` }}
          className="h-full flex flex-col border-r border-slate-800/90 bg-[#0c1017] overflow-hidden min-h-0"
        >
          {/* Left panel header tabs */}
          <div className="h-9 border-b border-slate-800 bg-[#0e131d] flex items-center px-2 space-x-1 shrink-0">
            <button
              onClick={() => setLeftTab('description')}
              className={`px-3 py-1 rounded text-xs font-medium flex items-center space-x-1.5 transition-colors ${
                leftTab === 'description'
                  ? 'bg-slate-800 text-blue-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Đề bài</span>
            </button>
            <button
              onClick={() => setLeftTab('submissions')}
              className={`px-3 py-1 rounded text-xs font-medium flex items-center space-x-1.5 transition-colors ${
                leftTab === 'submissions'
                  ? 'bg-slate-800 text-blue-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Lịch sử nộp bài</span>
            </button>
          </div>

          {/* Left content container */}
          <div className="flex-1 overflow-y-auto p-5 text-sm space-y-6">
            {leftTab === 'description' ? (
              <>
                {/* Markdown Problem Description */}
                <div>
                  <MarkdownRenderer content={problem.description} />
                </div>

                {/* Input Format */}
                {problem.inputFormat && (
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Định dạng Đầu vào (Input Format)
                    </h3>
                    <div className="bg-[#121824] p-3 rounded-lg border border-slate-800 text-xs text-slate-300 leading-relaxed">
                      <MarkdownRenderer content={problem.inputFormat} />
                    </div>
                  </div>
                )}

                {/* Output Format */}
                {problem.outputFormat && (
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Định dạng Đầu ra (Output Format)
                    </h3>
                    <div className="bg-[#121824] p-3 rounded-lg border border-slate-800 text-xs text-slate-300 leading-relaxed">
                      <MarkdownRenderer content={problem.outputFormat} />
                    </div>
                  </div>
                )}

                {/* Constraints */}
                {problem.constraints && (
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Ràng buộc (Constraints)
                    </h3>
                    <div className="bg-[#121824] p-3 rounded-lg border border-slate-800 text-xs text-slate-300 font-mono">
                      <MarkdownRenderer content={problem.constraints} />
                    </div>
                  </div>
                )}

                {/* Testcases (Sample & Hidden Tests after submission) */}
                {problem.testcases && problem.testcases.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400">
                          {showingAllTests ? 'Toàn bộ Testcases (Bao gồm Test Ẩn)' : 'Ví dụ mẫu (Sample Testcases)'}
                        </h3>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                          {problem.testcases.length} tests
                        </span>
                      </div>

                      {/* Nút mở khóa xem toàn bộ Test Ẩn nếu chưa mở */}
                      {!showingAllTests && problem._count?.testcases && problem._count.testcases > problem.testcases.length && (
                        <button
                          type="button"
                          onClick={() => fetchProblem(true)}
                          disabled={loadingAllTests}
                          className="text-[11px] font-mono text-purple-300 hover:text-purple-200 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 px-2.5 py-1 rounded-lg flex items-center space-x-1.5 transition-all"
                        >
                          <span>🔓 Xem tất cả {problem._count.testcases} tests (Mở khóa Test Ẩn)</span>
                        </button>
                      )}
                    </div>

                    {problem.testcases.map((tc, idx) => (
                      <div
                        key={tc.id || idx}
                        className={`border rounded-xl overflow-hidden text-xs ${
                          tc.isSample
                            ? 'bg-[#111722] border-slate-800/90'
                            : 'bg-[#131222] border-purple-900/40 shadow-sm'
                        }`}
                      >
                        <div
                          className={`px-3 py-1.5 font-semibold border-b flex items-center justify-between ${
                            tc.isSample
                              ? 'bg-[#141c2a] text-slate-300 border-slate-800/80'
                              : 'bg-[#1a162f] text-purple-200 border-purple-900/50'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <span>Testcase {idx + 1}</span>
                            <span
                              className={`text-[9px] px-2 py-0.2 rounded font-semibold ${
                                tc.isSample
                                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                  : 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                              }`}
                            >
                              {tc.isSample ? 'Test Mẫu (Ví dụ)' : '🔓 Test Ẩn (Hidden Test)'}
                            </span>
                          </div>
                          <button
                            onClick={() => copyToClipboard(tc.input, idx)}
                            className="text-[11px] text-slate-400 hover:text-white flex items-center space-x-1"
                            title="Sao chép Input"
                          >
                            {copiedInputIdx === idx ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">Đã chép</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Chép Input</span>
                              </>
                            )}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-800/80">
                          {/* Input */}
                          <div className="p-3">
                            <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                              Input:
                            </span>
                            <pre className="font-mono text-xs bg-[#0b0e14] p-2 rounded text-slate-200 overflow-x-auto whitespace-pre-wrap">
                              {tc.input}
                            </pre>
                          </div>

                          {/* Output */}
                          <div className="p-3">
                            <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                              Output:
                            </span>
                            <pre className="font-mono text-xs bg-[#0b0e14] p-2 rounded text-slate-200 overflow-x-auto whitespace-pre-wrap">
                              {tc.output}
                            </pre>
                          </div>
                        </div>

                        {tc.explanation && (
                          <div className="p-2.5 bg-[#0e141f] border-t border-slate-800/60 text-[11px] text-slate-400">
                            <span className="font-semibold text-slate-300">Giải thích: </span>
                            <MarkdownRenderer content={tc.explanation} className="inline-block" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              /* Submissions Tab */
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => setSubmissionsFilter('mine')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                        submissionsFilter === 'mine'
                          ? 'bg-blue-600/30 text-cyan-300 border border-blue-500/40'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Bài của tôi
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubmissionsFilter('all')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                        submissionsFilter === 'all'
                          ? 'bg-blue-600/30 text-cyan-300 border border-blue-500/40'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Tất cả ({problemSubmissions.length})
                    </button>
                  </div>

                  <button
                    onClick={() => fetchProblemSubmissions(submissionsFilter)}
                    className="text-[11px] text-cyan-400 hover:underline"
                  >
                    Làm mới
                  </button>
                </div>

                {loadingSubmissions ? (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    Đang nạp danh sách nộp bài...
                  </div>
                ) : problemSubmissions.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs space-y-1">
                    <div>
                      {submissionsFilter === 'mine'
                        ? username
                          ? `Chưa có bài nộp nào của thí sinh "${username}".`
                          : 'Bạn chưa nhập tên thí sinh. Hãy bấm nút Thí sinh ở trên để đặt tên!'
                        : 'Chưa có bài nộp nào cho bài tập này.'}
                    </div>
                    <p className="text-[11px] text-slate-600">Bấm "Submit" ở khung bên phải để nộp bài!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {problemSubmissions.map((sub) => {
                      const vCfg = VERDICT_CONFIG[sub.verdict as Verdict] || VERDICT_CONFIG.WA;
                      const isCurrent = submissionResult?.id === sub.id;
                      const isMine = username && sub.username && sub.username.toLowerCase() === username.toLowerCase();

                      return (
                        <div
                          key={sub.id}
                          onClick={() => {
                            setSubmissionResult(sub);
                            setConsoleTab('result');
                            setActiveTestIdx(0);
                          }}
                          className={`bg-[#121824] hover:bg-[#161f2e] border transition-all rounded-xl p-3 text-xs flex flex-col gap-2 cursor-pointer group ${
                            isCurrent
                              ? 'border-cyan-500 bg-cyan-950/20 shadow-md shadow-cyan-500/10'
                              : 'border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${vCfg.badge}`}
                              >
                                {sub.verdict}
                              </span>
                              <span className="text-slate-300 font-mono text-[11px]">
                                {sub.passedTests}/{sub.totalTests} tests
                              </span>
                            </div>

                            <div className="text-right text-[11px] font-mono text-slate-400 flex items-center space-x-2">
                              <span>{sub.time ? `${(sub.time * 1000).toFixed(0)} ms` : '-'}</span>
                              <span>•</span>
                              <span>{sub.memory ? `${(sub.memory / 1024).toFixed(1)} MB` : '-'}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[11px] text-slate-400">
                            <div className="flex items-center space-x-1.5 truncate max-w-[200px]">
                              <User className="w-3 h-3 text-cyan-400 shrink-0" />
                              <span className={`font-mono font-medium truncate ${isMine ? 'text-cyan-300' : 'text-slate-300'}`}>
                                {sub.username || 'Ẩn danh'}
                              </span>
                              {isMine && (
                                <span className="text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-1 rounded">
                                  Bạn
                                </span>
                              )}
                            </div>

                            <div className="flex items-center space-x-2">
                              <span className="text-[10px] text-slate-500 font-mono">
                                {mounted
                                  ? new Date(sub.createdAt).toLocaleTimeString('vi-VN', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      day: '2-digit',
                                      month: '2-digit',
                                    })
                                  : ''}
                              </span>

                              {/* Restore code to editor */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm('Khôi phục mã nguồn bài nộp này vào khung Code Editor?')) {
                                    setCode(sub.code);
                                    const matched = SUPPORTED_LANGUAGES.find((l) => l.id === sub.languageId);
                                    if (matched) setSelectedLang(matched);
                                  }
                                }}
                                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-cyan-300 border border-slate-700 flex items-center space-x-1 transition-all"
                                title="Nạp code này vào editor"
                              >
                                <ArrowDownToLine className="w-3 h-3 text-cyan-400" />
                                <span>Nạp code</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ================= RIGHT PANEL: Monaco Editor + Console ================= */}
        <div
          style={{ width: `${100 - splitRatio}%` }}
          className="h-full flex flex-col bg-[#141820] overflow-hidden min-h-0"
        >
          {/* Editor Header Bar */}
          <div className="h-10 border-b border-slate-800 bg-[#0e131d] px-3 flex items-center justify-between shrink-0">
            {/* Language Selector & Candidate Name */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <span className="text-[11px] text-slate-400">Ngôn ngữ:</span>
                <select
                  value={selectedLang.id}
                  onChange={(e) => handleLanguageChange(Number(e.target.value))}
                  className="bg-[#1a2130] border border-slate-700 text-white text-xs rounded px-2.5 py-1 focus:outline-none focus:border-blue-500 font-mono"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.id} value={lang.id}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Candidate Username indicator */}
              <button
                type="button"
                onClick={() => setIsUsernameModalOpen(true)}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs transition-all border ${
                  username
                    ? 'bg-slate-900 border-slate-700 text-slate-300 hover:border-cyan-500/50 hover:text-cyan-300'
                    : 'bg-amber-500/10 border-amber-500/40 text-amber-300 hover:bg-amber-500/20 animate-pulse'
                }`}
                title="Bấm để nhập hoặc đổi tên thí sinh"
              >
                <User className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-mono text-[11px] font-semibold max-w-[120px] truncate">
                  {username ? username : 'Nhập tên thí sinh *'}
                </span>
                <Edit3 className="w-3 h-3 text-slate-500" />
              </button>
            </div>

            {/* Editor Action buttons */}
            <div className="flex items-center space-x-2">
              {/* File upload badge indicator */}
              {uploadedFileName && (
                <div className="flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs animate-in fade-in">
                  <FileCode className="w-3.5 h-3.5 shrink-0" />
                  <span className="font-mono text-[11px] max-w-[140px] truncate" title={uploadedFileName}>
                    {uploadedFileName}
                  </span>
                  <button
                    type="button"
                    onClick={() => setUploadedFileName(null)}
                    className="p-0.5 hover:text-white text-emerald-300 transition-colors"
                    title="Bỏ nhãn file"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Upload File Input & Button */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".cpp,.c,.cc,.cxx,.py,.py3,.java,.pas,.txt"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center space-x-1.5 px-2.5 py-1 text-xs rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 border border-blue-500/30 hover:border-blue-500/50 transition-all font-medium"
                title="Tải tệp mã nguồn từ máy tính (.cpp, .py, .java)"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Nạp file</span>
              </button>

              <button
                onClick={handleResetCode}
                className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                title="Khôi phục code ban đầu"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Monaco Editor Container with Drag & Drop */}
          <div
            className={`flex-1 min-h-[300px] relative w-full overflow-hidden bg-[#1e1e1e] transition-all ${
              isDraggingFile ? 'ring-2 ring-cyan-400/80 ring-inset' : ''
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingFile(true);
            }}
            onDragLeave={() => setIsDraggingFile(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingFile(false);
              const file = e.dataTransfer.files?.[0];
              if (file) processUploadedFile(file);
            }}
          >
            {isDraggingFile && (
              <div className="absolute inset-0 z-20 bg-slate-950/85 backdrop-blur-sm border-2 border-dashed border-cyan-400 flex flex-col items-center justify-center pointer-events-none animate-in fade-in duration-150">
                <FileUp className="w-10 h-10 text-cyan-400 animate-bounce mb-2" />
                <p className="text-white font-semibold text-sm">Thả file mã nguồn vào đây để nạp code</p>
                <p className="text-slate-400 text-xs mt-1 font-mono">Tự động nhận diện .cpp, .py, .java (tối đa 2MB)</p>
              </div>
            )}
            <CodeEditor
              language={selectedLang.monacoLang}
              value={code}
              onChange={(value) => setCode(value)}
            />
          </div>

          {/* Bottom Execution Console & Actions */}
          <div className="border-t border-slate-800 bg-[#0b0e14] flex flex-col shrink-0">
            {/* Console Tabs */}
            <div className="h-9 border-b border-slate-800/80 bg-[#0e131d] px-3 flex items-center justify-between">
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setConsoleTab('sample')}
                  className={`px-2.5 py-1 rounded text-xs transition-colors ${
                    consoleTab === 'sample'
                      ? 'bg-slate-800 text-white font-medium'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Test Mẫu
                </button>
                <button
                  onClick={() => setConsoleTab('custom')}
                  className={`px-2.5 py-1 rounded text-xs transition-colors ${
                    consoleTab === 'custom'
                      ? 'bg-slate-800 text-white font-medium'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Nhập Custom
                </button>
                <button
                  onClick={() => setConsoleTab('result')}
                  className={`px-2.5 py-1 rounded text-xs flex items-center space-x-1 transition-colors ${
                    consoleTab === 'result'
                      ? 'bg-slate-800 text-blue-400 font-medium'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Terminal className="w-3 h-3" />
                  <span>Kết quả Chấm</span>
                </button>

                {/* Nút phóng to / thu nhỏ bảng console để xem trọn vẹn testcase */}
                <button
                  type="button"
                  onClick={() => setConsoleExpanded(!consoleExpanded)}
                  className="px-2 py-1 rounded text-xs text-slate-400 hover:text-cyan-300 hover:bg-slate-800/80 transition-colors flex items-center space-x-1 border border-transparent hover:border-slate-700 ml-1.5"
                  title={consoleExpanded ? 'Thu nhỏ bảng kết quả' : 'Phóng to bảng kết quả (không cần scroll)'}
                >
                  {consoleExpanded ? (
                    <>
                      <Minimize2 className="w-3 h-3 text-cyan-400" />
                      <span className="hidden sm:inline text-[11px] font-mono">Thu nhỏ</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-3 h-3 text-slate-400" />
                      <span className="hidden sm:inline text-[11px] font-mono">Toàn màn</span>
                    </>
                  )}
                </button>
              </div>

              {/* Action Buttons: Run & Submit */}
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 text-xs font-semibold border border-slate-700/80 hover:border-cyan-500/40 flex items-center space-x-1.5 transition-all active:scale-95 shadow-sm"
                  title="Tải tệp mã nguồn từ máy tính (.cpp, .py, .java)"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Nạp file</span>
                </button>

                <button
                  onClick={handleRun}
                  disabled={running || submitting}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-slate-200 text-xs font-semibold border border-slate-700/80 hover:border-emerald-500/40 flex items-center space-x-1.5 transition-all active:scale-95 shadow-sm"
                >
                  {running ? (
                    <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                  )}
                  <span>Run Sample</span>
                </button>

                <button
                  onClick={handleSubmit}
                  disabled={running || submitting}
                  className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 disabled:opacity-50 text-white text-xs font-bold flex items-center space-x-1.5 transition-all shadow-lg shadow-emerald-600/30 active:scale-95 border border-emerald-400/20"
                >
                  {submitting ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Submit</span>
                </button>
              </div>
            </div>

            {/* Console Content Area */}
            <div
              className={`${
                consoleExpanded
                  ? 'h-[520px] max-h-[75vh]'
                  : consoleTab === 'result'
                  ? 'h-[370px]'
                  : 'h-48'
              } overflow-y-auto p-3 text-xs font-mono bg-[#090c12] transition-all duration-200`}
            >
              {/* Tab 1: Sample Tests Preview */}
              {consoleTab === 'sample' && (
                <div className="space-y-3">
                  <div className="text-[11px] text-slate-400 flex items-center space-x-1">
                    <ChevronRight className="w-3.5 h-3.5 text-blue-400" />
                    <span>Bấm nút <strong>"Run Sample"</strong> để chạy thử với các testcase mẫu dưới đây:</span>
                  </div>
                  {problem.testcases?.map((tc, idx) => (
                    <div key={idx} className="bg-[#111722] p-2.5 rounded border border-slate-800 space-y-1">
                      <div className="text-slate-400 text-[10px] font-semibold">Test #{idx + 1}:</div>
                      <div className="text-slate-300">Input: <span className="text-amber-300">{tc.input.trim()}</span></div>
                      <div className="text-slate-300">Expected: <span className="text-emerald-300">{tc.output.trim()}</span></div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab 2: Custom Input */}
              {consoleTab === 'custom' && (
                <div className="h-full flex flex-col space-y-1">
                  <div className="text-[11px] text-slate-400">
                    Nhập dữ liệu stdin tùy ý để kiểm tra chương trình:
                  </div>
                  <textarea
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    placeholder="Nhập input tại đây..."
                    className="flex-1 w-full bg-[#111722] border border-slate-800 rounded p-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>
              )}

              {/* Tab 3: Execution / Judge Result */}
              {consoleTab === 'result' && (
                <div>
                  {running && (
                    <div className="py-8 flex flex-col items-center justify-center space-y-2 text-slate-400">
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Đang gửi code lên Piston API Engine & thực thi...</span>
                    </div>
                  )}

                  {submitting && (
                    <div className="py-8 flex flex-col items-center justify-center space-y-2 text-slate-400">
                      <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Đang chấm bài thi qua toàn bộ {problem._count?.testcases || 'các'} testcases...</span>
                    </div>
                  )}

                  {!running && !submitting && !runResult && !submissionResult && (
                    <div className="py-8 text-center text-slate-500">
                      Chưa có kết quả. Hãy bấm "Run Sample" hoặc "Submit" để xem kết quả chấm điểm.
                    </div>
                  )}

                  {/* Run Sample Result */}
                  {!running && runResult && (
                    <div className="space-y-3">
                      {runResult.error && (
                        <div className="bg-rose-500/10 border border-rose-500/30 p-2.5 rounded text-rose-300 whitespace-pre-wrap">
                          <strong>Lỗi thực thi:</strong> {runResult.error}
                        </div>
                      )}

                      {runResult.mode === 'custom' && (
                        <div className="bg-[#111722] p-3 rounded border border-slate-800 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-white">Custom Input Run</span>
                            <span className="text-[11px] text-slate-400">
                              {(runResult.time * 1000).toFixed(0)} ms • {runResult.memory} KB
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px]">Stdout:</span>
                            <pre className="bg-[#0b0e14] p-2 rounded text-emerald-400 overflow-x-auto whitespace-pre-wrap mt-0.5">
                              {runResult.stdout || '(Không có output)'}
                            </pre>
                          </div>
                          {runResult.error && (
                            <div>
                              <span className="text-rose-400 text-[10px]">Error/Stderr:</span>
                              <pre className="bg-[#0b0e14] p-2 rounded text-rose-300 overflow-x-auto whitespace-pre-wrap mt-0.5">
                                {runResult.error}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}

                      {runResult.mode === 'sample' && runResult.results && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-semibold text-white">Kết quả Sample:</span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  VERDICT_CONFIG[runResult.overallVerdict as Verdict]?.badge ||
                                  VERDICT_CONFIG.WA.badge
                                }`}
                              >
                                {runResult.overallVerdict}
                              </span>
                            </div>
                            <span className="text-xs text-slate-400">
                              Đúng {runResult.results.filter((r: any) => r.verdict === 'AC').length}/
                              {runResult.results.length} test
                            </span>
                          </div>

                          <div className="space-y-2">
                            {runResult.results.map((r: SingleTestResult, idx: number) => {
                              const vCfg = VERDICT_CONFIG[r.verdict] || VERDICT_CONFIG.WA;
                              return (
                                <div
                                  key={idx}
                                  className="bg-[#111722] p-2.5 rounded border border-slate-800/80 space-y-1.5"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-slate-300">Test #{r.testIndex}</span>
                                    <div className="flex items-center space-x-2">
                                      <span className="text-[10px] text-slate-400 font-mono">
                                        {r.time ? `${(r.time * 1000).toFixed(0)}ms` : '-'}
                                      </span>
                                      <span
                                        className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${vCfg.badge}`}
                                      >
                                        {r.verdict}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                                    <div className="bg-[#0b0e14] p-1.5 rounded">
                                      <span className="text-[9px] text-slate-500 uppercase block">Expected:</span>
                                      <span className="text-emerald-300">{r.expectedOutput?.trim()}</span>
                                    </div>
                                    <div className="bg-[#0b0e14] p-1.5 rounded">
                                      <span className="text-[9px] text-slate-500 uppercase block">Your Output:</span>
                                      <span className={r.verdict === 'AC' ? 'text-emerald-300' : 'text-rose-400'}>
                                        {r.stdout?.trim() || '(empty)'}
                                      </span>
                                    </div>
                                  </div>

                                  {r.error && (
                                    <div className="bg-rose-500/10 p-1.5 rounded border border-rose-500/20 text-rose-300 text-[10px] whitespace-pre-wrap">
                                      {r.error}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Submit Result */}
                  {!submitting && submissionResult && (
                    <div className="space-y-2.5">
                      {/* Overall Verdict Banner */}
                      {(() => {
                        const vCfg =
                          VERDICT_CONFIG[submissionResult.verdict as Verdict] || VERDICT_CONFIG.WA;
                        const isAC = submissionResult.verdict === 'AC';

                        return (
                          <div
                            className={`p-2.5 rounded-lg border flex items-center justify-between ${
                              isAC
                                ? 'bg-emerald-500/15 border-emerald-500/40'
                                : 'bg-rose-500/15 border-rose-500/40'
                            }`}
                          >
                            <div className="flex items-center space-x-2.5">
                              {isAC ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                              ) : (
                                <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                              )}
                              <div className="flex items-center space-x-2">
                                <span className={`text-sm font-extrabold ${isAC ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {vCfg.label} ({submissionResult.verdict})
                                </span>
                                <span className="text-[11px] text-slate-400 hidden sm:inline">• {vCfg.desc}</span>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2.5 text-xs font-mono">
                              <span className="font-bold text-white bg-slate-900/80 px-2 py-0.5 rounded border border-slate-700/80">
                                {submissionResult.passedTests} / {submissionResult.totalTests} tests đúng
                              </span>
                              <span className="text-slate-400 hidden sm:inline">
                                {submissionResult.time ? `${(submissionResult.time * 1000).toFixed(0)}ms` : '-'}
                              </span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Compile or Runtime error display */}
                      {(submissionResult.compileOutput || submissionResult.stderr) && (
                        <div className="bg-rose-500/10 border border-rose-500/30 p-2.5 rounded text-rose-300 text-xs">
                          <span className="font-bold block mb-1 text-rose-400">Chi tiết lỗi:</span>
                          <pre className="whitespace-pre-wrap font-mono text-[11px]">
                            {submissionResult.compileOutput || submissionResult.stderr}
                          </pre>
                        </div>
                      )}

                      {/* Interactive Testcases Breakdown & Hidden Test Inspector */}
                      {consoleTestResults.length > 0 && (
                        <div className="space-y-2 pt-1">
                          <div className="flex items-center justify-between gap-1 pb-0.5">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-bold text-white">
                                Toàn bộ {consoleTestResults.length} Testcases:
                              </span>
                              <span className="text-[10px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.2 rounded-full font-mono font-medium">
                                🔓 Đã mở khóa Test Ẩn
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400">
                              Chọn testcase để soi chi tiết:
                            </span>
                          </div>

                          {/* Test Selector Tabs: ngang mượt mà, không lồng scrollbar dọc */}
                          <div className="flex items-center gap-1.5 pb-1 overflow-x-auto no-scrollbar">
                            {consoleTestResults.map((tr, idx) => {
                              const isTestAC = tr.verdict === 'AC';
                              const isSelected = activeTestIdx === idx;
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setActiveTestIdx(idx)}
                                  className={`px-2.5 py-1 rounded-lg border text-left font-mono text-xs transition-all flex items-center space-x-1.5 cursor-pointer shrink-0 ${
                                    isSelected
                                      ? 'border-cyan-400 bg-cyan-500/20 shadow-md shadow-cyan-500/20 ring-1 ring-cyan-400'
                                      : isTestAC
                                      ? 'bg-[#111722] hover:bg-[#151f2e] border-slate-800 text-slate-300'
                                      : 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 text-rose-300'
                                  }`}
                                >
                                  <span className="font-bold">#{tr.testIndex}</span>
                                  <span
                                    className={`text-[9px] px-1 py-0.2 rounded font-semibold ${
                                      tr.isSample
                                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                        : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                    }`}
                                  >
                                    {tr.isSample ? 'Mẫu' : 'Ẩn'}
                                  </span>
                                  <span
                                    className={`text-[10px] font-bold ${
                                      isTestAC ? 'text-emerald-400' : 'text-rose-400'
                                    }`}
                                  >
                                    {tr.verdict}
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Selected Test Detail Viewer */}
                          {(() => {
                            const curTest =
                              consoleTestResults[activeTestIdx] ||
                              consoleTestResults[0];
                            if (!curTest) return null;
                            const isCurAC = curTest.verdict === 'AC';
                            const vCfg =
                              VERDICT_CONFIG[curTest.verdict as Verdict] || VERDICT_CONFIG.WA;

                            return (
                              <div className="bg-[#101522] border border-slate-800 rounded-xl p-3 space-y-2.5">
                                {/* Header of current test */}
                                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xs font-bold text-white">
                                      Test #{curTest.testIndex}
                                    </span>
                                    <span
                                      className={`px-1.5 py-0.2 rounded text-[10px] font-semibold flex items-center space-x-1 ${
                                        curTest.isSample
                                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                          : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                      }`}
                                    >
                                      {curTest.isSample ? 'Test Mẫu' : '🔓 Test Ẩn'}
                                    </span>
                                    <span
                                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${vCfg.badge}`}
                                    >
                                      {curTest.verdict}
                                    </span>
                                  </div>

                                  <div className="flex items-center space-x-3 text-[11px] font-mono text-slate-400">
                                    <div>
                                      Thời gian:{' '}
                                      <span className="text-slate-200">
                                        {curTest.time !== undefined
                                          ? `${(curTest.time * 1000).toFixed(0)} ms`
                                          : '-'}
                                      </span>
                                    </div>
                                    <div>
                                      Bộ nhớ:{' '}
                                      <span className="text-slate-200">
                                        {curTest.memory !== undefined ? `${curTest.memory} KB` : '-'}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Test Data Inspection Grid: 3 cột song song trên desktop không cần scroll */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                                  {/* Cột 1: Input */}
                                  <div className="bg-[#0b0e14] border border-slate-800/80 rounded-lg p-2.5 flex flex-col">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold">
                                        Dữ liệu vào (Input):
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => copyToClipboard(curTest.input || '', 9999)}
                                        className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 font-mono"
                                      >
                                        <Copy className="w-3 h-3" />
                                        <span>Chép</span>
                                      </button>
                                    </div>
                                    <pre className="font-mono text-xs text-slate-200 whitespace-pre-wrap break-all max-h-36 overflow-y-auto">
                                      {curTest.input !== undefined && curTest.input !== ''
                                        ? curTest.input
                                        : '(Không có input)'}
                                    </pre>
                                  </div>

                                  {/* Cột 2: Expected Output */}
                                  <div className="bg-[#0b0e14] border border-slate-800/80 rounded-lg p-2.5 flex flex-col">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-[10px] font-mono uppercase text-emerald-400 font-semibold">
                                        Đáp án chuẩn (Expected):
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          copyToClipboard(curTest.expectedOutput || '', 9998)
                                        }
                                        className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center space-x-1 font-mono"
                                      >
                                        <Copy className="w-3 h-3" />
                                        <span>Chép</span>
                                      </button>
                                    </div>
                                    <pre className="font-mono text-xs text-emerald-300 whitespace-pre-wrap break-all max-h-36 overflow-y-auto">
                                      {curTest.expectedOutput !== undefined &&
                                      curTest.expectedOutput !== ''
                                        ? curTest.expectedOutput
                                        : '(Không có expected)'}
                                    </pre>
                                  </div>

                                  {/* Cột 3: Your Output / Stdout */}
                                  <div
                                    className={`bg-[#0b0e14] border rounded-lg p-2.5 flex flex-col ${
                                      isCurAC
                                        ? 'border-slate-800/80'
                                        : 'border-rose-500/40 bg-rose-500/5'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold">
                                        Code của bạn (Your Output):
                                      </span>
                                      <span
                                        className={`text-[10px] font-mono font-bold ${
                                          isCurAC ? 'text-emerald-400' : 'text-rose-400'
                                        }`}
                                      >
                                        {isCurAC ? 'Khớp đáp án ✓' : 'Sai khác ✗'}
                                      </span>
                                    </div>
                                    <pre
                                      className={`font-mono text-xs whitespace-pre-wrap break-all max-h-36 overflow-y-auto ${
                                        isCurAC ? 'text-emerald-300' : 'text-rose-300'
                                      }`}
                                    >
                                      {curTest.stdout !== undefined && curTest.stdout !== ''
                                        ? curTest.stdout
                                        : '(Không có stdout output)'}
                                    </pre>
                                  </div>
                                </div>

                                {/* Error / Stderr if any */}
                                {curTest.error && (
                                  <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-2 text-rose-300 text-xs">
                                    <span className="font-bold block mb-0.5 font-mono text-rose-400 text-[10px]">
                                      Lỗi runtime / Stderr:
                                    </span>
                                    <pre className="whitespace-pre-wrap font-mono text-[11px]">
                                      {curTest.error}
                                    </pre>
                                  </div>
                                )}

                                {/* Explanation if any */}
                                {curTest.explanation && (
                                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 text-slate-300 text-xs">
                                    <span className="font-semibold text-blue-400">Giải thích: </span>
                                    <MarkdownRenderer content={curTest.explanation} className="inline-block" />
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <UsernameModal
        isOpen={isUsernameModalOpen}
        onClose={() => setIsUsernameModalOpen(false)}
        onSaved={(newUsername) => {
          setUsername(newUsername);
        }}
        title={username ? 'Thay Đổi Tên Thí Sinh' : 'Nhập Tên Thí Sinh Để Chấm Bài'}
        description="Bạn cần nhập tên thí sinh để hệ thống ghi nhận kết quả và chấm bài thi."
      />
    </div>
  );
}
