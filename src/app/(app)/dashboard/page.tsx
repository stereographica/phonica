'use client';

import React from 'react';
import { DashboardGrid } from '@/components/features/dashboard/DashboardGrid';
import { DashboardControls } from '@/components/features/dashboard/DashboardControls';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">ダッシュボード</h1>
          <p className="text-sm text-muted-foreground mt-1">
            録音活動の概要とコレクションの統計情報
          </p>
        </div>
        <DashboardControls />
      </div>

      <DashboardGrid />
    </div>
  );
}
