'use client';

import { Sidebar } from './sidebar';
import { BottomNav } from './bottom-nav';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen bg-zinc-950 overflow-x-hidden">
      <Sidebar />
      <main className="flex-1 lg:ml-0 pb-16 lg:pb-0 min-w-0 overflow-x-hidden">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

