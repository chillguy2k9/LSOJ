'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { VERDICT_CONFIG } from '@/lib/constants';
import { SubmissionDTO, Verdict, SingleTestResult } from '@/types';
import {
  History,
  Eye,
  Copy,
  Check,
  Clock,
  HardDrive,
  X,
  Code2,
  User,
  Filter,
  Search,
  RotateCw,
  ExternalLink,
} from 'lucide-react';
import { getStoredUsername, subscribeToUsername } from '@/lib/user';

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<SubmissionDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionDTO | null>(null);
  const [activeModalTestIdx, setActiveModalTestIdx] = useState<number>(0);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedInput, setCopiedInput] = useState(false);
  const [copiedExpected, setCopiedExpected] = useState(false);

  // Filters & User state
  const [myUsername, setMyUsername] = useState<string>('');
  const [searchUsername, setSearchUsername] = useState<string>('');
  const [selectedVerdict, setSelectedVerdict] = useState<string>('ALL');
  const [onlyMine, setOnlyMine] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    const initialName = getStoredUsername();
    setMyUsername(initialName);

    const unsubscribe = subscribeToUsername((name) => {
      setMyUsername(name);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    fetchSubmissions();
  }, [selectedVerdict, onlyMine]);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('limit', '50');

      if (selectedVerdict && selectedVerdict !== 'ALL') {
        params.set('verdict', selectedVerdict);
      }

      if (onlyMine && myUsername) {
        params.set('exactUsername', myUsername);
      } else if (searchUsername.trim()) {
        params.set('username', searchUsername.trim());
      }

      const res = await fetch(`/api/submissions?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data);
      }
    } catch (err) {
      console.error('Lỗi khi tải submissions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setOnlyMine(false);
    fetchSubmissions();
  };

  const handleToggleOnlyMine = () => {
    if (!myUsername) {
      alert('Vui lòng đặt tên thí sinh ở góc trên bên phải trước để xem bài của bạn!');
      return;
    }
    const nextState = !onlyMine;
    setOnlyMine(nextState);
    if (nextState) {
      setSearchUsername('');
    }
  };

  const openSubmissionModal = (sub: SubmissionDTO) => {
    setSelectedSubmission(sub);
    setActiveModalTestIdx(0);
    setCopiedCode(false);
    setCopiedInput(false);
    setCopiedExpected(false);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Safe normalized test results for modal
  const modalTestResults = useMemo<SingleTestResult[]>(() => {
    if (!selectedSubmission || !selectedSubmission.testResults) return [];
    if (Array.isArray(selectedSubmission.testResults)) {
      return selectedSubmission.testResults;
    }
    if (typeof selectedSubmission.testResults === 'string') {
      try {
        return JSON.parse(selectedSubmission.testResults);
      } catch {
        return [];
      }
    }
    return [];
  }, [selectedSubmission]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Lịch Sử Chấm Bài
            </h1>
            <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-3 py-1 rounded-full">
              LANG SON OJ
            </span>
            <span className="text-xs font-mono font-normal text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-full">
              {submissions.length} lượt nộp
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5">
            Theo dõi tất cả bài nộp của thí sinh, phán quyết chấm điểm và chi tiết các testcase
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => fetchSubmissions()}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#10141e] border border-slate-800 rounded-2xl p-4 mb-6 shadow-lg">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Quick toggle: My submissions vs All */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setOnlyMine(false);
                setSearchUsername('');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                !onlyMine && !searchUsername
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800'
              }`}
            >
              Tất cả bài nộp
            </button>

            {myUsername && (
              <button
                onClick={handleToggleOnlyMine}
                className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                  onlyMine
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-400 shadow-md shadow-cyan-600/25'
                    : 'bg-slate-900 text-cyan-300 border-slate-800 hover:bg-cyan-950/40 hover:border-cyan-500/30'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Bài của tôi ({myUsername})</span>
              </button>
            )}
          </div>

          {/* Search by username & filter verdict */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search form */}
            <form onSubmit={handleSearchSubmit} className="flex items-center relative flex-1 sm:w-64">
              <input
                type="text"
                value={searchUsername}
                onChange={(e) => setSearchUsername(e.target.value)}
                placeholder="Tìm theo tên thí sinh..."
                className="w-full bg-[#0b0e14] border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl pl-8 pr-16 py-1.5 text-xs text-white placeholder-slate-500 outline-none transition-all font-mono"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5" />
              <button
                type="submit"
                className="absolute right-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] rounded-lg transition-colors font-medium"
              >
                Tìm
              </button>
            </form>

            {/* Verdict filter */}
            <div className="flex items-center space-x-1.5 bg-[#0b0e14] border border-slate-800 rounded-xl px-2.5 py-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] text-slate-400">Kết quả:</span>
              <select
                value={selectedVerdict}
                onChange={(e) => setSelectedVerdict(e.target.value)}
                className="bg-transparent text-white text-xs outline-none cursor-pointer font-semibold"
              >
                <option value="ALL" className="bg-[#121824] text-white">Tất cả</option>
                <option value="AC" className="bg-[#121824] text-emerald-400">AC (Accepted)</option>
                <option value="WA" className="bg-[#121824] text-rose-400">WA (Wrong Answer)</option>
                <option value="TLE" className="bg-[#121824] text-amber-400">TLE (Time Limit)</option>
                <option value="MLE" className="bg-[#121824] text-amber-400">MLE (Memory Limit)</option>
                <option value="RTE" className="bg-[#121824] text-rose-400">RTE (Runtime Error)</option>
                <option value="CE" className="bg-[#121824] text-amber-300">CE (Compile Error)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="bg-[#0f141d] border border-slate-800/90 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#121824] text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800 tracking-wider">
              <tr>
                <th className="py-3.5 px-4 w-14 text-center">ID</th>
                <th className="py-3.5 px-4 min-w-[130px]">Thí sinh</th>
                <th className="py-3.5 px-4 min-w-[180px]">Bài tập</th>
                <th className="py-3.5 px-4 w-28 text-center">Phán quyết</th>
                <th className="py-3.5 px-4">Ngôn ngữ</th>
                <th className="py-3.5 px-4 text-center">Tests đúng</th>
                <th className="py-3.5 px-4 text-center">Thời gian</th>
                <th className="py-3.5 px-4 text-center">Bộ nhớ</th>
                <th className="py-3.5 px-4 text-right">Thời điểm</th>
                <th className="py-3.5 px-4 w-16 text-center">Xem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-slate-400">
                    <div className="inline-flex items-center space-x-2">
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Đang tải danh sách bài nộp...</span>
                    </div>
                  </td>
                </tr>
              ) : submissions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-slate-500 space-y-2">
                    <div className="text-base font-medium text-slate-400">Không tìm thấy lượt nộp bài nào</div>
                    <p className="text-xs text-slate-500">
                      {onlyMine
                        ? `Bạn chưa có bài nộp nào dưới tên "${myUsername}". Hãy vào phần Bài tập để bắt đầu nộp bài!`
                        : 'Chưa có bài nộp nào thỏa mãn bộ lọc hiện tại.'}
                    </p>
                  </td>
                </tr>
              ) : (
                submissions.map((sub, idx) => {
                  const vCfg = VERDICT_CONFIG[sub.verdict as Verdict] || VERDICT_CONFIG.WA;
                  const isMine = myUsername && sub.username && sub.username.toLowerCase() === myUsername.toLowerCase();

                  return (
                    <tr
                      key={sub.id}
                      className={`hover:bg-slate-800/40 transition-colors group cursor-pointer ${
                        isMine ? 'bg-blue-950/10' : ''
                      }`}
                      onClick={() => openSubmissionModal(sub)}
                    >
                      <td className="py-4 px-4 text-center font-mono text-slate-500 text-xs">
                        #{idx + 1}
                      </td>

                      {/* Username Column */}
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-1.5">
                          <span
                            className={`font-semibold font-mono text-xs flex items-center space-x-1 ${
                              isMine ? 'text-cyan-400' : 'text-slate-200'
                            }`}
                          >
                            <span>{sub.username || 'Ẩn danh'}</span>
                          </span>
                          {isMine && (
                            <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.2 rounded font-semibold">
                              Bạn
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Problem Column */}
                      <td className="py-4 px-4">
                        <div className="space-y-0.5">
                          {sub.problem ? (
                            <Link
                              href={`/problems/${sub.problem.slug}`}
                              onClick={(e) => e.stopPropagation()}
                              className="font-medium text-white hover:text-blue-400 transition-colors"
                            >
                              {sub.problem.title}
                            </Link>
                          ) : (
                            <span className="text-slate-400">Bài tập #{sub.problemId}</span>
                          )}
                          <div className="text-[11px] font-mono text-slate-500">
                            {sub.problem?.slug}
                          </div>
                        </div>
                      </td>

                      {/* Verdict */}
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${vCfg.badge}`}
                        >
                          {sub.verdict}
                        </span>
                      </td>

                      {/* Language */}
                      <td className="py-4 px-4 font-mono text-xs text-slate-300">
                        {sub.language}
                      </td>

                      {/* Passed Tests */}
                      <td className="py-4 px-4 text-center font-mono text-xs">
                        <span
                          className={
                            sub.passedTests === sub.totalTests && sub.totalTests > 0
                              ? 'text-emerald-400 font-bold'
                              : 'text-slate-300'
                          }
                        >
                          {sub.passedTests} / {sub.totalTests}
                        </span>
                      </td>

                      {/* Time */}
                      <td className="py-4 px-4 text-center font-mono text-xs text-slate-400">
                        {sub.time ? `${(sub.time * 1000).toFixed(0)} ms` : '-'}
                      </td>

                      {/* Memory */}
                      <td className="py-4 px-4 text-center font-mono text-xs text-slate-400">
                        {sub.memory ? `${(sub.memory / 1024).toFixed(1)} MB` : '-'}
                      </td>

                      {/* Date (safe client format to prevent hydration mismatch) */}
                      <td className="py-4 px-4 text-right text-xs text-slate-400 font-mono">
                        {mounted
                          ? new Date(sub.createdAt).toLocaleString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })
                          : ''}
                      </td>

                      {/* View Details Button */}
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openSubmissionModal(sub);
                          }}
                          className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Xem chi tiết kết quả test và code"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submission Detail Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#10141d] border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#131924]">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Code2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-bold text-white">
                      Lượt nộp #{selectedSubmission.id.slice(0, 8)}
                    </h3>
                    <span className="text-xs font-mono text-cyan-400 bg-cyan-950/50 border border-cyan-500/30 px-2 py-0.5 rounded-full flex items-center space-x-1">
                      <User className="w-3 h-3" />
                      <span>{selectedSubmission.username || 'Ẩn danh'}</span>
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {selectedSubmission.problem?.title} • {selectedSubmission.language}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2.5">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    VERDICT_CONFIG[selectedSubmission.verdict as Verdict]?.badge || ''
                  }`}
                >
                  {selectedSubmission.verdict}
                </span>

                {selectedSubmission.problem?.slug && (
                  <Link
                    href={`/problems/${selectedSubmission.problem.slug}`}
                    className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors"
                    title="Mở bài tập này"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                )}

                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5 text-xs">
              {/* Summary stats */}
              <div className="grid grid-cols-4 gap-2.5 bg-[#151c28] p-3 rounded-xl border border-slate-800/80 text-center font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Thí sinh</span>
                  <span className="text-xs font-bold text-cyan-400 truncate block">
                    {selectedSubmission.username || 'Ẩn danh'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Testcases</span>
                  <span className="text-xs font-bold text-white">
                    {selectedSubmission.passedTests} / {selectedSubmission.totalTests}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Thời gian</span>
                  <span className="text-xs font-bold text-white">
                    {selectedSubmission.time ? `${(selectedSubmission.time * 1000).toFixed(0)} ms` : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Bộ nhớ</span>
                  <span className="text-xs font-bold text-white">
                    {selectedSubmission.memory ? `${(selectedSubmission.memory / 1024).toFixed(1)} MB` : '-'}
                  </span>
                </div>
              </div>

              {/* Error messages if any */}
              {(selectedSubmission.compileOutput || selectedSubmission.stderr) && (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-rose-300">
                  <strong className="block mb-1 text-rose-400">Thông báo lỗi:</strong>
                  <pre className="whitespace-pre-wrap font-mono text-[11px] overflow-x-auto">
                    {selectedSubmission.compileOutput || selectedSubmission.stderr}
                  </pre>
                </div>
              )}

              {/* Testcases Breakdown & Hidden Tests Inspector */}
              {modalTestResults.length > 0 && (
                <div className="space-y-3 pt-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-white">
                        Chi tiết {modalTestResults.length} Testcases đã chấm:
                      </span>
                      <span className="text-[10px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded-full font-mono">
                        🔓 Mở khóa Test Ẩn
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Bấm vào từng test để xem Input và Output
                    </span>
                  </div>

                  {/* Test selection tabs */}
                  <div className="flex flex-wrap gap-1.5 pb-1 max-h-28 overflow-y-auto">
                    {modalTestResults.map((tr, idx) => {
                      const isTestAC = tr.verdict === 'AC';
                      const isSelected = activeModalTestIdx === idx;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveModalTestIdx(idx)}
                          className={`px-2.5 py-1 rounded-lg border text-left font-mono text-xs transition-all flex items-center space-x-1.5 cursor-pointer ${
                            isSelected
                              ? 'border-cyan-400 bg-cyan-500/20 shadow-md shadow-cyan-500/20 ring-1 ring-cyan-400'
                              : isTestAC
                              ? 'bg-[#151c28] hover:bg-[#1a2333] border-slate-800 text-slate-300'
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

                  {/* Selected Test Detail */}
                  {(() => {
                    const curTest = modalTestResults[activeModalTestIdx] || modalTestResults[0];
                    if (!curTest) return null;
                    const isCurAC = curTest.verdict === 'AC';
                    const vCfg = VERDICT_CONFIG[curTest.verdict as Verdict] || VERDICT_CONFIG.WA;

                    return (
                      <div className="bg-[#131924] border border-slate-800 rounded-xl p-3.5 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-bold text-white">
                              Testcase #{curTest.testIndex}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                curTest.isSample
                                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                  : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              }`}
                            >
                              {curTest.isSample ? 'Test Mẫu (Sample)' : '🔓 Test Ẩn (Hidden Test)'}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${vCfg.badge}`}
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

                        {/* Test Data */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="bg-[#0b0e14] border border-slate-800/80 rounded-lg p-2.5 flex flex-col">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold">
                                Dữ liệu vào (Input):
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(curTest.input || '');
                                  setCopiedInput(true);
                                  setTimeout(() => setCopiedInput(false), 1500);
                                }}
                                className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 font-mono"
                              >
                                {copiedInput ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                <span>{copiedInput ? 'Đã chép' : 'Chép'}</span>
                              </button>
                            </div>
                            <pre className="font-mono text-xs text-slate-200 whitespace-pre-wrap break-all max-h-36 overflow-y-auto">
                              {curTest.input !== undefined && curTest.input !== ''
                                ? curTest.input
                                : '(Testcase không có input)'}
                            </pre>
                          </div>

                          <div className="bg-[#0b0e14] border border-slate-800/80 rounded-lg p-2.5 flex flex-col">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[10px] font-mono uppercase text-emerald-400 font-semibold">
                                Đáp án chuẩn (Expected):
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(curTest.expectedOutput || '');
                                  setCopiedExpected(true);
                                  setTimeout(() => setCopiedExpected(false), 1500);
                                }}
                                className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center space-x-1 font-mono"
                              >
                                {copiedExpected ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                <span>{copiedExpected ? 'Đã chép' : 'Chép'}</span>
                              </button>
                            </div>
                            <pre className="font-mono text-xs text-emerald-300 whitespace-pre-wrap break-all max-h-36 overflow-y-auto">
                              {curTest.expectedOutput !== undefined && curTest.expectedOutput !== ''
                                ? curTest.expectedOutput
                                : '(Không có expected output)'}
                            </pre>
                          </div>
                        </div>

                        {/* User Output */}
                        <div className="bg-[#0b0e14] border border-slate-800/80 rounded-lg p-2.5">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold">
                              Output của code (Stdout):
                            </span>
                            <span
                              className={`text-[10px] font-mono font-bold ${
                                isCurAC ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {isCurAC ? 'Khớp đáp án ✓' : 'Khác đáp án chuẩn ✗'}
                            </span>
                          </div>
                          <pre
                            className={`font-mono text-xs whitespace-pre-wrap break-all max-h-36 overflow-y-auto ${
                              isCurAC ? 'text-emerald-300' : 'text-rose-300'
                            }`}
                          >
                            {curTest.stdout !== undefined && curTest.stdout !== ''
                              ? curTest.stdout
                              : '(Không có stdout)'}
                          </pre>
                        </div>

                        {/* Error if any */}
                        {curTest.error && (
                          <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-2.5 text-rose-300 text-xs">
                            <span className="font-bold block mb-1 font-mono text-rose-400 text-[11px]">
                              Lỗi runtime / Stderr:
                            </span>
                            <pre className="whitespace-pre-wrap font-mono text-[11px]">
                              {curTest.error}
                            </pre>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Source code viewer */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-300">Mã nguồn đã nộp:</span>
                  <button
                    onClick={() => handleCopyCode(selectedSubmission.code)}
                    className="flex items-center space-x-1 text-slate-400 hover:text-white text-[11px]"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Đã sao chép</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Sao chép code</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="bg-[#0b0e14] border border-slate-800 p-4 rounded-xl text-slate-200 font-mono text-xs overflow-x-auto max-h-72">
                  <code>{selectedSubmission.code}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
