'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

// ダミーデータ型 (実際の型に合わせて変更してください)
interface Material {
  id: string;
  title: string;
  description: string | null;
  recordedDate: string;
  category: string;
  tags: string[];
  filePath: string;
  // 他のフィールド...
}

interface MaterialDetailModalProps {
  material: Material | null;
  isOpen: boolean;
  onClose: () => void;
}

export function MaterialDetailModal({ material, isOpen, onClose }: MaterialDetailModalProps) {
  if (!material) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{material.title}</DialogTitle>
          <DialogDescription>
            {/* 素材に関する簡単な説明や日付などを表示 */}
            Recorded on: {new Date(material.recordedDate).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* 詳細情報を表示するセクション */}
          <div>
            <h3 className="font-semibold mb-2">Description:</h3>
            <p className="text-sm text-muted-foreground">{material.description || 'N/A'}</p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Category:</h3>
            <p className="text-sm text-muted-foreground">{material.category}</p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Tags:</h3>
            <div className="flex flex-wrap gap-2">
              {material.tags.map((tag) => (
                <span key={tag} className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-2">File Path:</h3>
            <p className="text-sm text-muted-foreground break-all">{material.filePath}</p>
          </div>
          {/* TODO: 音声プレイヤーの組み込み */}
          {/* TODO: GPS情報や地図表示 */}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Close
            </Button>
          </DialogClose>
          {/* 必要であれば編集ボタンなどを追加 */}
          {/* <Button type="button">Edit</Button> */}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 
