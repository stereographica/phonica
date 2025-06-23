'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useNotification } from '@/hooks/use-notification';

interface BulkDeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMaterials: { id: string; title: string }[];
  onDeleted: () => void;
}

export function BulkDeleteConfirmationModal({
  isOpen,
  onClose,
  selectedMaterials,
  onDeleted,
}: BulkDeleteConfirmationModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { notifyError, notifySuccess } = useNotification();

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const response = await fetch('/api/materials/bulk/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          materialIds: selectedMaterials.map((m) => m.id),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete materials');
      }

      const result = await response.json();

      notifySuccess('削除', `${result.deletedCount}件の素材`);

      onDeleted();
      onClose();
    } catch (error) {
      console.error('Failed to delete materials:', error);
      notifyError(error instanceof Error ? error : new Error('Failed to delete materials'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete {selectedMaterials.length} Materials
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete these materials? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-2">
            The following materials will be permanently deleted:
          </p>
          <div className="max-h-48 overflow-y-auto space-y-1 rounded border p-2">
            {selectedMaterials.map((material) => (
              <div key={material.id} className="text-sm px-2 py-1">
                • {material.title}
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Total: {selectedMaterials.length} materials
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete All'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
