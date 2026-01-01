'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Wallet, Plus } from 'lucide-react';

export default function AssetsPage() {
  return (
    <DashboardLayout>
      <div className="min-h-screen bg-zinc-950 text-white">
        {/* Header */}
        <div className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Wallet className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Assets</h1>
                  <p className="text-sm text-zinc-400">Manage your assets</p>
                </div>
              </div>
              <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Asset
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Empty State */}
          <div className="bg-zinc-900 rounded-xl p-12 border border-zinc-800 text-center">
            <div className="max-w-md mx-auto">
              <div className="p-4 bg-purple-500/10 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Wallet className="h-8 w-8 text-purple-400" />
              </div>
              <h2 className="text-xl font-semibold mb-2">No assets yet</h2>
              <p className="text-zinc-400 mb-6">
                Track your assets to get a complete picture of your financial situation.
              </p>
              <button className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors">
                Add Your First Asset
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

