'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Terminal, Code2, ListFilter, History, Shield, Cpu, User, BookOpen, Edit3 } from 'lucide-react';
import UsernameModal from '@/components/UsernameModal';
import { getStoredUsername, subscribeToUsername } from '@/lib/user';

export default function Navbar() {
  const pathname = usePathname();
  const [username, setUsername] = useState<string>('');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setUsername(getStoredUsername());
    const unsubscribe = subscribeToUsername((newVal) => {
      setUsername(newVal);
    });
    return unsubscribe;
  }, []);

  const navItems = [
    { label: 'Bài tập', href: '/problems', icon: ListFilter },
    { label: 'Lịch sử nộp', href: '/submissions', icon: History },
    { label: 'Quản trị viên', href: '/admin', icon: Shield },
    { label: 'HDSD (PDF)', href: '/HUONG_DAN_SU_DUNG_LANG_SON_OJ.pdf', icon: BookOpen, isExternal: true },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#090c13]/90 backdrop-blur-xl border-b border-slate-800/80 px-4 lg:px-8 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand & Dev info */}
        <div className="flex items-center space-x-6">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-all duration-300 group-hover:scale-105">
                <Terminal className="w-5 h-5 text-white" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
              </span>
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <span className="text-base font-extrabold tracking-tight text-white group-hover:text-blue-400 transition-colors">
                  LANG SON OJ
                </span>
              </div>
              <span className="text-[10px] font-mono tracking-wider block text-cyan-400 font-semibold leading-none">
                ONLINE JUDGE SYSTEM
              </span>
            </div>
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center space-x-1 pl-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              if (item.isExternal) {
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-cyan-400 hover:bg-slate-800/60 transition-all"
                  >
                    <Icon className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{item.label}</span>
                  </a>
                );
              }
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600/15 text-blue-400 font-semibold border border-blue-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Status / Quick Action */}
        <div className="flex items-center space-x-2.5">
          {/* Candidate Username Badge / Trigger */}
          {mounted && (
            <button
              type="button"
              onClick={() => setIsUserModalOpen(true)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                username
                  ? 'bg-blue-950/40 border-blue-500/30 text-blue-300 hover:bg-blue-900/50 hover:border-blue-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
              }`}
              title="Bấm để đặt hoặc đổi tên thí sinh"
            >
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <span className="max-w-[130px] truncate font-semibold">
                {username ? username : 'Đặt tên thí sinh'}
              </span>
              <Edit3 className="w-3 h-3 text-slate-400" />
            </button>
          )}

          <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-[#0e1420] border border-slate-800 text-[11px] text-slate-400 font-mono shadow-inner">
            <Cpu className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span>Piston Engine</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          </div>

          <Link
            href="/problems"
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold transition-all shadow-md shadow-blue-600/25 active:scale-95 border border-blue-400/20"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Luyện tập</span>
          </Link>
        </div>
      </div>

      <UsernameModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        title={username ? 'Thay Đổi Tên Thí Sinh' : 'Nhập Tên Thí Sinh'}
      />
    </header>
  );
}
