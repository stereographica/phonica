'use client';

import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input'; // Not used in the current basic UI
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit2, Trash2, Combine } from 'lucide-react';

// ダミーデータ型
interface Tag {
  id: string;
  name: string;
  slug: string;
  materialCount: number;
}

// ダミーデータ
const dummyTags: Tag[] = [
  {
    id: '1',
    name: '自然音',
    slug: 'nature-sound',
    materialCount: 12,
  },
  {
    id: '2',
    name: '鳥',
    slug: 'bird',
    materialCount: 8,
  },
  {
    id: '3',
    name: '都市音',
    slug: 'urban-sound',
    materialCount: 5,
  },
  {
    id: '4',
    name: '雨',
    slug: 'rain',
    materialCount: 3,
  },
];

export default function TagsMasterPage() {
  // TODO: 将来的にはServer ActionやAPIからデータを取得
  const tags = dummyTags;

  // TODO: タグのリネーム、削除、統合の処理

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tag Management</h1>
        {/* <Button onClick={() => alert('Open New Tag Modal or Inline Add')}>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Tag
        </Button> */}
        {/* 新規タグは素材登録時に作成されるのが主なので、専用の追加ボタンは一旦保留 */}
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Material Count</TableHead>
              <TableHead className="w-[50px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tags.map((tag) => (
              <TableRow key={tag.id}>
                <TableCell className="font-medium">{tag.name}</TableCell>
                <TableCell>{tag.slug}</TableCell>
                <TableCell>{tag.materialCount}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => alert(`Rename: ${tag.name}`)}> {/* TODO: インライン編集 or モーダル */}
                        <Edit2 className="mr-2 h-4 w-4" /> Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => alert(`Merge: ${tag.name}`)}> {/* TODO: 統合UI表示 */}
                        <Combine className="mr-2 h-4 w-4" /> Merge
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => alert(`Delete: ${tag.name}`)}> {/* TODO: 削除処理 */}
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
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
