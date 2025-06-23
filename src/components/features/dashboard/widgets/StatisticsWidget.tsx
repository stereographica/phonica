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
import { TrendingUp, Mic, Calendar } from 'lucide-react';

// TODO: 実際のデータ取得とAPIコールを実装
export function StatisticsWidget() {
  const [activeTab, setActiveTab] = useState('tags');

  // タグ別素材数のダミーデータ
  const tagData = [
    { name: '鳥', count: 45 },
    { name: '雨', count: 32 },
    { name: '海', count: 28 },
    { name: '風', count: 24 },
    { name: '街', count: 18 },
    { name: 'その他', count: 15 },
  ];

  // 月別録音数のダミーデータ
  const monthlyData = [
    { month: '1月', count: 12 },
    { month: '2月', count: 15 },
    { month: '3月', count: 22 },
    { month: '4月', count: 28 },
    { month: '5月', count: 35 },
    { month: '6月', count: 31 },
  ];

  // 機材別使用頻度のダミーデータ
  const equipmentData = [
    { name: 'Zoom H6', count: 68 },
    { name: 'TASCAM DR-40X', count: 45 },
    { name: 'Sony PCM-D100', count: 32 },
    { name: 'RODE VideoMic', count: 18 },
  ];

  // 統計サマリー
  const summary = {
    totalMaterials: 162,
    totalDuration: 2847, // 分
    totalSize: 14.3, // GB
    averageRating: 3.8,
  };

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280'];

  return (
    <div className="space-y-4">
      {/* サマリーカード */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">総素材数</p>
              <p className="text-lg font-semibold">{summary.totalMaterials}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">総録音時間</p>
              <p className="text-lg font-semibold">{Math.floor(summary.totalDuration / 60)}時間</p>
            </div>
          </div>
        </Card>
      </div>

      {/* グラフタブ */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tags">タグ</TabsTrigger>
          <TabsTrigger value="monthly">月別</TabsTrigger>
          <TabsTrigger value="equipment">機材</TabsTrigger>
        </TabsList>

        <TabsContent value="tags" className="mt-4">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={tagData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={60}
                fill="#8884d8"
                dataKey="count"
              >
                {tagData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </TabsContent>

        <TabsContent value="monthly" className="mt-4">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis fontSize={12} />
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
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            <span>前月比 +12%</span>
          </div>
        </TabsContent>

        <TabsContent value="equipment" className="mt-4">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={equipmentData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis type="number" fontSize={12} />
              <YAxis dataKey="name" type="category" fontSize={12} width={100} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </TabsContent>
      </Tabs>
    </div>
  );
}
