'use client';

import React, { useState, useEffect, useRef } from 'react';
import { User, Check, X, AlertCircle } from 'lucide-react';
import { getStoredUsername, setStoredUsername } from '@/lib/user';

interface UsernameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (newUsername: string) => void;
  title?: string;
  description?: string;
  allowCloseWithoutName?: boolean;
}

export default function UsernameModal({
  isOpen,
  onClose,
  onSaved,
  title = 'Nhập Tên Thí Sinh',
  description = 'Vui lòng cung cấp tên hoặc mã định danh của bạn. Tên này sẽ gắn liền với tất cả các bài nộp và kết quả chấm điểm trên hệ thống.',
  allowCloseWithoutName = true,
}: UsernameModalProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(getStoredUsername());
      setError(null);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();

    if (!trimmed) {
      setError('Tên thí sinh không được để trống.');
      return;
    }

    if (trimmed.length < 2) {
      setError('Tên thí sinh cần có ít nhất 2 ký tự.');
      return;
    }

    if (trimmed.length > 35) {
      setError('Tên thí sinh không được vượt quá 35 ký tự.');
      return;
    }

    setStoredUsername(trimmed);
    if (onSaved) {
      onSaved(trimmed);
    }
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && allowCloseWithoutName) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div className="bg-[#101522] border border-blue-500/30 rounded-2xl max-w-md w-full shadow-2xl shadow-blue-950/50 overflow-hidden relative">
        {/* Glow accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-indigo-600"></div>

        {/* Modal Header */}
        <div className="p-5 pb-3 flex items-center justify-between border-b border-slate-800/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
              <p className="text-[11px] text-cyan-400 font-mono">LANG SON OJ CANDIDATE</p>
            </div>
          </div>

          {allowCloseWithoutName && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-xs text-slate-300 leading-relaxed">{description}</p>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-200">
              Tên thí sinh / Người nộp bài <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="VD: NguyenVanA_12Tin, HoangLong..."
                className="w-full bg-[#0b0e14] border border-slate-700 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 font-medium outline-none transition-all shadow-inner"
              />
            </div>
            <div className="flex justify-between items-center text-[11px] text-slate-500 pt-0.5">
              <span>Được lưu trên trình duyệt của bạn (Local Storage)</span>
              <span>{name.length}/35</span>
            </div>
          </div>

          {error && (
            <div className="flex items-center space-x-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            {allowCloseWithoutName && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Hủy bỏ
              </button>
            )}
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-bold transition-all shadow-lg shadow-blue-600/30 flex items-center space-x-2 active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Xác nhận & Lưu</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
