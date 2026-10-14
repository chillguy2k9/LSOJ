'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { ZoomIn, X, Download } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  compact?: boolean;
}

export default function MarkdownRenderer({ content, className = '', compact = false }: MarkdownRendererProps) {
  // Modal phóng to ảnh
  const [zoomedImage, setZoomedImage] = useState<{ src: string; alt?: string } | null>(null);

  // Tự động làm sạch các ký tự escape markdown (ví dụ \$N$ -> $N$) để KaTeX không nuốt text
  const sanitizedContent = React.useMemo(() => {
    if (!content) return '';
    return content
      .replaceAll('\\$', '$')
      .replaceAll('\\*', '*')
      .replaceAll('\\-', '-')
      .replaceAll('\\[', '[')
      .replaceAll('\\]', ']')
      .replaceAll('\\=', '=')
      .replaceAll('\\_', '_')
      .replaceAll('\\`', '`')
      .replaceAll('\\#', '#')
      .replaceAll('\\\\le', '\\le')
      .replaceAll('\\\\ge', '\\ge')
      .replaceAll('\\\\ne', '\\ne');
  }, [content]);

  return (
    <>
      <div className={compact ? `text-slate-300 ${className}` : `prose prose-invert max-w-none text-slate-300 ${className}`}>
        <ReactMarkdown
          remarkPlugins={[remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={{
            h1: ({ node, ...props }) => (
              <h1 className="text-xl font-bold text-white mt-4 mb-2 pb-1 border-b border-slate-800" {...props} />
            ),
            h2: ({ node, ...props }) => (
              <h2 className="text-lg font-bold text-white mt-4 mb-2 pb-1 border-b border-slate-800/60" {...props} />
            ),
            h3: ({ node, ...props }) => (
              <h3 className="text-base font-semibold text-blue-400 mt-4 mb-1" {...props} />
            ),
            p: ({ node, ...props }) => (
              <p className={compact ? 'text-inherit leading-relaxed mb-1.5 last:mb-0' : 'text-slate-300 leading-relaxed mb-3 text-sm'} {...props} />
            ),
            ul: ({ node, ...props }) => (
              <ul className={compact ? 'list-disc pl-4 mb-1.5 last:mb-0 space-y-0.5 text-inherit' : 'list-disc pl-5 mb-3 text-sm space-y-1 text-slate-300'} {...props} />
            ),
            ol: ({ node, ...props }) => (
              <ol className={compact ? 'list-decimal pl-4 mb-1.5 last:mb-0 space-y-0.5 text-inherit' : 'list-decimal pl-5 mb-3 text-sm space-y-1 text-slate-300'} {...props} />
            ),
            li: ({ node, ...props }) => (
              <li className="leading-relaxed text-inherit" {...props} />
            ),
            // Custom renderer cho thẻ img: Hiển thị xếp dọc xuống, bo góc sang trọng, click để phóng to
            img: ({ node, src, alt, ...props }: any) => {
              if (!src) return null;
              return (
                <div className="my-5 flex flex-col items-center">
                  <div className="relative group max-w-full rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-950/60 shadow-2xl transition-all hover:border-cyan-500/50">
                    <img
                      src={src}
                      alt={alt || 'Ảnh đề bài'}
                      className="w-full h-auto object-contain max-h-[750px] cursor-zoom-in transition-transform duration-200 group-hover:scale-[1.01]"
                      loading="lazy"
                      onClick={() => setZoomedImage({ src, alt: alt || 'Ảnh đề bài' })}
                      {...props}
                    />
                    <div
                      onClick={() => setZoomedImage({ src, alt: alt || 'Ảnh đề bài' })}
                      className="absolute inset-0 bg-cyan-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-zoom-in pointer-events-none"
                    >
                      <span className="px-3 py-1.5 rounded-full bg-slate-900/90 text-cyan-400 text-xs font-semibold flex items-center space-x-1.5 shadow-xl border border-cyan-500/30 backdrop-blur-sm">
                        <ZoomIn className="w-3.5 h-3.5" />
                        <span>Nhấn để xem ảnh phóng to</span>
                      </span>
                    </div>
                  </div>
                  {alt && (
                    <span className="text-[11px] text-slate-400 mt-1.5 italic font-sans text-center">
                      {alt}
                    </span>
                  )}
                </div>
              );
            },
            pre: ({ node, ...props }: any) => (
              <pre className="bg-[#0f141c] p-3 rounded-lg border border-slate-800 text-slate-200 text-xs font-mono my-2 overflow-x-auto" {...props} />
            ),
            code: ({ node, className, children, ...props }: any) => {
              const isBlock = Boolean(className?.includes('language-') || (typeof children === 'string' && children.includes('\n')));
              if (!isBlock) {
                return (
                  <code className="bg-slate-800/80 text-amber-300 px-1.5 py-0.5 rounded text-[11px] font-mono border border-slate-700/50" {...props}>
                    {children}
                  </code>
                );
              }
              return (
                <code className={`text-slate-200 font-mono text-xs ${className || ''}`} {...props}>
                  {children}
                </code>
              );
            },
            blockquote: ({ node, ...props }) => (
              <blockquote className="border-l-4 border-blue-500 pl-3 italic text-slate-400 my-2 text-sm bg-blue-500/5 py-1 rounded-r" {...props} />
            ),
            strong: ({ node, ...props }) => <strong className="font-semibold text-white" {...props} />,
            table: ({ node, ...props }) => (
              <div className="overflow-x-auto my-3 border border-slate-800 rounded-lg">
                <table className="w-full text-xs text-left border-collapse" {...props} />
              </div>
            ),
            th: ({ node, ...props }) => <th className="bg-slate-800/60 p-2 font-medium text-slate-200 border-b border-slate-800" {...props} />,
            td: ({ node, ...props }) => <td className="p-2 border-b border-slate-800/50 text-slate-300" {...props} />,
          }}
        >
          {sanitizedContent}
        </ReactMarkdown>
      </div>

      {/* Lightbox Modal phóng to ảnh */}
      {zoomedImage && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setZoomedImage(null)}
        >
          <div className="absolute top-4 right-4 flex items-center space-x-2 z-10" onClick={(e) => e.stopPropagation()}>
            <a
              href={zoomedImage.src}
              download="de-bai.png"
              target="_blank"
              rel="noreferrer"
              className="p-2.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700"
              title="Tải ảnh về máy"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              type="button"
              onClick={() => setZoomedImage(null)}
              className="p-2.5 rounded-full bg-slate-800/80 hover:bg-rose-600 text-white transition-colors border border-slate-700"
              title="Đóng (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div
            className="max-w-[95vw] max-h-[92vh] overflow-auto flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={zoomedImage.src}
              alt={zoomedImage.alt || 'Ảnh đề bài'}
              className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl border border-slate-800"
            />
          </div>
          {zoomedImage.alt && (
            <p className="mt-3 text-xs text-slate-400 font-medium">
              {zoomedImage.alt}
            </p>
          )}
        </div>
      )}
    </>
  );
}
