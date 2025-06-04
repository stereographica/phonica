'use client';

import { useEffect, useState } from 'react';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MoreHorizontal, Edit2, Trash2, Combine, PlusCircle } from 'lucide-react';
import { TagFormModal } from '@/components/master/TagFormModal';
import { useNotification } from '@/hooks/use-notification';
import type { Tag } from '@prisma/client';

// APIレスポンス型（素材数を含む）
interface TagWithCount extends Tag {
  _count: {
    materials: number;
  };
}

export default function TagsMasterPage() {
  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<TagWithCount | null>(null);
  const { notifyError, notifySuccess } = useNotification();

  const fetchTags = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/master/tags');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setTags(data.tags || []);
    } catch (e: unknown) {
      console.error('Failed to fetch tags:', e);
      if (e instanceof Error) {
        setError(e.message || 'Failed to load tags.');
      } else {
        setError('An unknown error occurred while fetching tags.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const handleAdd = () => {
    setSelectedTag(null);
    setIsModalOpen(true);
  };

  const handleEdit = (tag: TagWithCount) => {
    setSelectedTag(tag);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (tag: TagWithCount) => {
    setTagToDelete(tag);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!tagToDelete) return;

    try {
      const response = await fetch(`/api/master/tags/${tagToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      notifySuccess('delete', 'tag');
      fetchTags();
    } catch (e: unknown) {
      console.error('Failed to delete tag:', e);
      notifyError(e, { operation: 'delete', entity: 'tag' });
    } finally {
      setDeleteConfirmOpen(false);
      setTagToDelete(null);
    }
  };

  const handleMerge = (tag: TagWithCount) => {
    // TODO: タグ統合機能の実装（別のIssueで対応予定）
    alert(`Merge functionality for "${tag.name}" will be implemented in a future update.`);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <p className="text-destructive">Error: {error}</p>
        <Button onClick={fetchTags}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tag Management</h1>
        <Button onClick={handleAdd}>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Tag
        </Button>
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
                <TableCell>{tag._count.materials}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(tag)}>
                        <Edit2 className="mr-2 h-4 w-4" /> Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleMerge(tag)}>
                        <Combine className="mr-2 h-4 w-4" /> Merge
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDeleteClick(tag)}
                        disabled={tag._count.materials > 0}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete {tag._count.materials > 0 && `(${tag._count.materials} materials)`}
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

      <TagFormModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        initialData={selectedTag}
        onSuccess={fetchTags}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {tagToDelete && (
                <>
                  This will permanently delete the tag &quot;{tagToDelete.name}&quot;.
                  {tagToDelete._count.materials > 0 && (
                    <span className="block mt-2 font-semibold text-destructive">
                      This tag is used by {tagToDelete._count.materials} material(s) and cannot be
                      deleted.
                    </span>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
