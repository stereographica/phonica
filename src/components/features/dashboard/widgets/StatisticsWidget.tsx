'use client';

import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { TrendingUp, Mic, Calendar, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDashboardStats } from '@/hooks/use-dashboard-stats';

export function StatisticsWidget() {
  const [activeTab, setActiveTab] = useState('tags');
  const { data: stats, isLoading, error, refetch } = useDashboardStats();

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280'];

  // ローディング状態
  if (isLoading) {
    return (
      <div className="space-y-2 h-full">
        <div className="grid grid-cols-2 gap-2">
          <Card className="p-2">
            <div className="h-8 bg-gray-200 animate-pulse rounded"></div>
          </Card>
          <Card className="p-2">
            <div className="h-8 bg-gray-200 animate-pulse rounded"></div>
          </Card>
        </div>
        <div className="h-40 bg-gray-200 animate-pulse rounded"></div>
      </div>
    );
  }

  // エラー状態
  if (error) {
    return (
      <div className="space-y-2 h-full flex flex-col items-center justify-center">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <p className="text-sm text-muted-foreground text-center">
          統計データの読み込みに失敗しました
        </p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-3 w-3 mr-1" />
          再試行
        </Button>
      </div>
    );
  }

  // データが存在しない場合
  if (!stats) {
    return (
      <div className="space-y-2 h-full flex flex-col items-center justify-center">
        <Mic className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground text-center">統計データがありません</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 h-full">
      {/* サマリーカード */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="p-2">
          <div className="flex items-center gap-2">
            <Mic className="h-3 w-3 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">総素材数</p>
              <p className="text-sm font-semibold">{stats.summary.totalMaterials}</p>
            </div>
          </div>
        </Card>
        <Card className="p-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">総録音時間</p>
              <p className="text-sm font-semibold">
                {Math.floor(stats.summary.totalDuration / 60)}時間
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* グラフタブ */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-8">
          <TabsTrigger value="tags" className="text-xs">
            タグ
          </TabsTrigger>
          <TabsTrigger value="monthly" className="text-xs">
            月別
          </TabsTrigger>
          <TabsTrigger value="equipment" className="text-xs">
            機材
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tags" className="mt-1">
          {stats.tagData.length > 0 ? (
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie
                  data={stats.tagData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={40}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {stats.tagData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[150px] flex items-center justify-center text-sm text-muted-foreground">
              タグデータがありません
            </div>
          )}
        </TabsContent>

        <TabsContent value="monthly" className="mt-1">
          {stats.monthlyData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={stats.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="month" fontSize={10} />
                  <YAxis fontSize={10} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: '#10b981' }}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                <span>過去6ヶ月の録音活動</span>
              </div>
            </>
          ) : (
            <div className="h-[150px] flex items-center justify-center text-sm text-muted-foreground">
              月別データがありません
            </div>
          )}
        </TabsContent>

        <TabsContent value="equipment" className="mt-1">
          {stats.equipmentData.length > 0 ? (
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={stats.equipmentData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis type="number" fontSize={10} />
                <YAxis dataKey="name" type="category" fontSize={10} width={80} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[150px] flex items-center justify-center text-sm text-muted-foreground">
              機材データがありません
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
