export interface Tag {
  id: string;
  name: string;
  slug?: string; // slug はオプショナルかもしれない
}

export interface Equipment {
  id: string;
  name: string;
  type?: string; // type はオプショナルかもしれない
}

export interface Material {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  recordedAt: string; // APIレスポンスに合わせてstring (ISO 8601)
  categoryName?: string | null;
  tags: Tag[];
  filePath: string;
  fileFormat?: string | null;
  sampleRate?: number | null;
  bitDepth?: number | null;
  durationSeconds?: number | null;
  channels?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  locationName?: string | null;
  equipment?: Equipment[];
  notes?: string | null;
  rating?: number | null; // お気に入り度（1-5の5段階評価、null=未評価）
  favorited?: boolean | null;
  transcription?: string | null;
  createdAt?: string; // APIレスポンスに合わせてstring (ISO 8601)
  updatedAt?: string; // APIレスポンスに合わせてstring (ISO 8601)
}
