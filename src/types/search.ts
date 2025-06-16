import { Material, Tag, Equipment } from './material';

// 検索結果の型定義
export interface SearchResult {
  materials: (Material & { score?: number })[];
  tags?: (Tag & { score?: number; _count?: { materials: number } })[];
  equipment?: (Equipment & { score?: number; manufacturer?: string })[];
}

// 検索APIのレスポンス型
export interface SearchApiResponse {
  data: SearchResult;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalItems: number;
  };
  query: string;
}

// 検索タイプのenum
export type SearchType = 'all' | 'materials' | 'tags' | 'equipment';

// 検索クエリパラメータの型
export interface SearchQueryParams {
  q: string;
  page?: number;
  limit?: number;
  type?: SearchType;
}
