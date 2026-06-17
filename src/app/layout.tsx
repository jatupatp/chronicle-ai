import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';
import { Newspaper, FileText, Settings as SettingsIcon, LayoutDashboard } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Chronicle AI - แดชบอร์ดเขียนข่าวอัจฉริยะ',
  description: 'ระบบดึงข่าวอัตโนมัติ เรียบเรียงสไตล์คุณ และโพสลง Social Media ทันที',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className="h-full">
      <body className="h-full bg-background text-foreground flex overflow-hidden">
        {/* Sidebar Nav */}
        <aside className="w-64 border-r border-border bg-card flex flex-col justify-between h-full shrink-0">
          <div>
            {/* Logo area */}
            <div className="p-6 border-b border-border flex items-center space-x-3">
              <Newspaper className="w-6 h-6 text-accent" />
              <span className="font-serif tracking-tight font-bold text-xl">Chronicle AI</span>
            </div>
            
            {/* Nav Menu */}
            <nav className="p-4 space-y-1">
              <Link
                href="/"
                className="flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-stone-100 dark:hover:bg-stone-900 transition-colors"
              >
                <LayoutDashboard className="w-4 h-4 text-stone-500" />
                <span>หน้าหลัก (Dashboard)</span>
              </Link>
              
              <Link
                href="/drafts"
                className="flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-stone-100 dark:hover:bg-stone-900 transition-colors"
              >
                <FileText className="w-4 h-4 text-stone-500" />
                <span>บทร่างข่าว (Drafts)</span>
              </Link>
              
              <Link
                href="/settings"
                className="flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-stone-100 dark:hover:bg-stone-900 transition-colors"
              >
                <SettingsIcon className="w-4 h-4 text-stone-500" />
                <span>ตั้งค่าระบบ (Settings)</span>
              </Link>
            </nav>
          </div>

          {/* Footer Area */}
          <div className="p-4 border-t border-border flex items-center justify-between">
            <div className="text-xs text-muted">
              <p>Chronicle AI v1.0.0</p>
              <p className="mt-0.5">สถานะ: ทำงานปกติ</p>
            </div>
            <ThemeToggle />
          </div>
        </aside>

        {/* Main Workspace Area */}
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
