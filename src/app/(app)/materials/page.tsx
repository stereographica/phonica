'use client';

import Link from 'next/link';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle } from 'lucide-react';

// ダミーデータ型
interface Material {
  id: string;
  title: string;
  recordedAt: string;
  fileFormat: string;
  sampleRate: number;
  bitDepth: number;
  tags: string[];
  rating: number | null;
}

// ダミーデータ
const dummyMaterials: Material[] = [
  {
    id: '1',
    title: '公園の鳥の声',
    recordedAt: '2024-05-01',
    fileFormat: 'WAV',
    sampleRate: 48000,
    bitDepth: 24,
    tags: ['自然音', '鳥'],
    rating: 4,
  },
  {
    id: '2',
    title: '駅の雑踏',
    recordedAt: '2024-05-10',
    fileFormat: 'MP3',
    sampleRate: 44100,
    bitDepth: 16,
    tags: ['都市音', '雑踏'],
    rating: null,
  },
  {
    id: '3',
    title: '静かな雨音',
    recordedAt: '2024-04-20',
    fileFormat: 'WAV',
    sampleRate: 96000,
    bitDepth: 24,
    tags: ['自然音', '雨'],
    rating: 5,
  },
];

export default function MaterialsPage() {
  // TODO: 将来的にはServer ActionやAPIからデータを取得
  const materials = dummyMaterials;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Materials</h1>
        <Link href="/materials/new" passHref>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Material
          </Button>
        </Link>
      </div>

      {/* TODO: 絞り込み・ソートUIは後で追加 */}
      {/* TODO: 一括操作ツールバーは後で追加 */}

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox /> {/* TODO: ヘッダーチェックボックスの全選択機能 */}
              </TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Recorded At</TableHead>
              <TableHead>Format</TableHead>
              <TableHead>Rate/Depth</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead className="w-[50px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {materials.map((material) => (
              <TableRow key={material.id}>
                <TableCell>
                  <Checkbox />
                </TableCell>
                <TableCell className="font-medium">{material.title}</TableCell>
                <TableCell>{material.recordedAt}</TableCell>
                <TableCell>{material.fileFormat}</TableCell>
                <TableCell>
                  {material.sampleRate / 1000}kHz / {material.bitDepth}bit
                </TableCell>
                <TableCell>
                  {material.tags.map((tag) => (
                    // TODO: タグの表示をBadgeコンポーネントなどを使って見栄え良くする
                    <span key={tag} className="mr-1 text-xs p-1 bg-muted rounded">
                      {tag}
                    </span>
                  ))}
                </TableCell>
                <TableCell>{material.rating ? '★'.repeat(material.rating) : '-'}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>View Details</DropdownMenuItem> {/* TODO: 詳細モーダル表示 */}
                      <DropdownMenuItem asChild>
                        <Link href={`/materials/${material.id}/edit`}>Edit</Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        Delete {/* TODO: 削除確認モーダル表示 */}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {/* TODO: ページネーションは後で追加 */}
    </div>
  );
} 
