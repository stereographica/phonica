'use client';

import { useState, useEffect } from 'react';
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
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, Eye } from 'lucide-react';
import { MaterialDetailModal } from '@/components/materials/MaterialDetailModal';

// 表示用の素材データの型 (Prismaの型とは異なる場合がある)
// Prisma の Material モデルに合わせて調整
interface Material {
  id: string;
  title: string;
  description: string | null;
  recordedDate: Date; // PrismaからはDate型で取得される
  categoryName: string | null; // category テーブルとのリレーションを想定
  tags: { name: string }[]; // tags テーブルとのリレーションを想定 (多対多)
  filePath: string;
  // 必要に応じて他のフィールドを追加 (例: waveformData, durationSeconds)
}

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function fetchMaterials() {
      setIsLoading(true);
      try {
        // 本来は try-catch やエラーハンドリングをしっかり行う
        // ここでは /api/materials から取得する想定 (APIルートは別途作成)
        const response = await fetch('/api/materials');
        if (!response.ok) {
          throw new Error('Failed to fetch materials');
        }
        const data: Material[] = await response.json();
        setMaterials(data);
      } catch (error) {
        console.error(error);
        // TODO: エラー表示処理
      }
      setIsLoading(false);
    }
    fetchMaterials();
  }, []);

  const openModal = (material: Material) => {
    setSelectedMaterial(material);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedMaterial(null);
  };

  if (isLoading) {
    return <div>Loading materials...</div>; // 簡単なローディング表示
  }

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
              <TableHead>Category</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead className="hidden md:table-cell">Recorded Date</TableHead>
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
                <TableCell>{material.categoryName || 'N/A'}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {material.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag.name}
                        className="px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded-full"
                      >
                        {tag.name}
                      </span>
                    ))}
                    {material.tags.length > 2 && (
                      <span className="text-xs text-muted-foreground">
                        +{material.tags.length - 2} more
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {new Date(material.recordedDate).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => openModal(material)}>
                        <Eye className="mr-2 h-4 w-4" /> View Details
                      </DropdownMenuItem>
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

      <MaterialDetailModal
        material={selectedMaterial ? ({
          id: selectedMaterial.id,
          title: selectedMaterial.title,
          description: selectedMaterial.description,
          recordedDate: selectedMaterial.recordedDate.toISOString(),
          category: selectedMaterial.categoryName || 'N/A',
          tags: selectedMaterial.tags.map(t => t.name),
          filePath: selectedMaterial.filePath,
        }) : null}
        isOpen={isModalOpen}
        onClose={closeModal}
      />
    </div>
  );
} 
