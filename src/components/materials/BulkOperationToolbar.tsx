'use client';

import React from 'react';
import { Trash2, Tag, FolderPlus, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BulkOperationToolbarProps {
  selectedCount: number;
  onBulkDelete: () => void;
  onBulkTag: () => void;
  onBulkAddToProject: () => void;
  onBulkDownload: () => void;
}

export function BulkOperationToolbar({
  selectedCount,
  onBulkDelete,
  onBulkTag,
  onBulkAddToProject,
  onBulkDownload,
}: BulkOperationToolbarProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-background border rounded-lg shadow-lg p-4 flex items-center gap-4">
        <div className="text-sm font-medium">
          {selectedCount} {selectedCount === 1 ? 'material' : 'materials'} selected
        </div>

        <div className="h-6 w-px bg-border" />

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onBulkDelete}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>

          <Button variant="outline" size="sm" onClick={onBulkTag}>
            <Tag className="h-4 w-4 mr-2" />
            Tag
          </Button>

          <Button variant="outline" size="sm" onClick={onBulkAddToProject}>
            <FolderPlus className="h-4 w-4 mr-2" />
            Add to Project
          </Button>

          <Button variant="outline" size="sm" onClick={onBulkDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </div>
    </div>
  );
}
