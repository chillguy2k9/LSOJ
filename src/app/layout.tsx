import type { Metadata } from 'next';
import 'katex/dist/katex.min.css';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'LANG SON OJ - Hệ Thống Chấm Bài Trực Tuyến Hiện Đại',
  description: 'Nền tảng thi đấu lập trình và giải thuật Competitive Programming thế hệ mới (LANG SON OJ)',
  keywords: ['LANG SON OJ', 'Online Judge', 'Competitive Programming', 'Lập trình thi đấu'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="dark">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-screen bg-[#080a0f] text-slate-100 antialiased flex flex-col selection:bg-blue-600 selection:text-white bg-cyber-grid">
        <Navbar />
        <main className="flex-1 flex flex-col">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
