/**
 * ダッシュボードAPI関連の型定義
 */

// ダッシュボード統計サマリー
export interface DashboardSummary {
  totalMaterials: number;
  totalDuration: number; // 分単位
  averageRating: number;
  materialsWithLocation: number;
}

// タグ別データ
export interface TagData {
  name: string;
  count: number;
}

// 月別データ
export interface MonthlyData {
  month: string; // "1月", "2月" 形式
  count: number;
}

// 機材別データ
export interface EquipmentData {
  name: string;
  count: number;
}

// ダッシュボード統計レスポンス
export interface DashboardStats {
  summary: DashboardSummary;
  tagData: TagData[];
  monthlyData: MonthlyData[];
  equipmentData: EquipmentData[];
}

// 未整理素材
export interface UnorganizedMaterial {
  id: string;
  slug: string;
  title: string;
  recordedAt: string;
  issues: string[]; // 不足している項目のリスト
  tags: Array<{ id: string; name: string }>;
  memo: string | null;
  location: {
    latitude: number | null;
    longitude: number | null;
    name: string | null;
  };
  rating: number | null;
  equipments: Array<{ id: string; name: string }>;
}

// 未整理素材レスポンス
export interface UnorganizedMaterialsResponse {
  materials: UnorganizedMaterial[];
  totalCount: number;
  limit: number;
}

// ランダム素材（今日の音用）
export interface RandomMaterial {
  id: string;
  slug: string;
  title: string;
  filePath: string;
  fileFormat: string | null;
  sampleRate: number | null;
  bitDepth: number | null;
  durationSeconds: number | null;
  channels: number | null;
  recordedAt: string;
  location: {
    latitude: number | null;
    longitude: number | null;
    name: string | null;
  };
  memo: string | null;
  rating: number | null;
  tags: Array<{ id: string; name: string; slug: string }>;
  projects: Array<{ id: string; name: string; slug: string }>;
  equipments: Array<{ id: string; name: string; type: string; manufacturer: string | null }>;
  createdAt: string;
  updatedAt: string;
  audioUrl: string;
  peaks: number[]; // 波形データ
}

// ランダム素材レスポンス
export interface RandomMaterialResponse {
  material: RandomMaterial | null;
}

// 録音活動データ（カレンダー用）
export interface RecordingActivity {
  date: string; // YYYY-MM-DD形式
  count: number;
}

export interface RecordingActivityResponse {
  activities: RecordingActivity[];
  totalDays: number;
  startDate: string;
  endDate: string;
  totalRecordings: number;
  peakDay: {
    date: string;
    count: number;
  } | null;
}

// 位置情報付き素材（地図用）
export interface MaterialWithLocation {
  id: string;
  slug: string;
  title: string;
  latitude: number;
  longitude: number;
  recordedAt: string;
  location?: string;
}

export interface MaterialsWithLocationResponse {
  materials: MaterialWithLocation[];
  totalCount: number;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  } | null;
  center: {
    lat: number;
    lng: number;
  } | null;
}
