'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
// RadioGroup component not available, using native radio inputs
import { Label } from '@/components/ui/label';
import { Loader2, Tag } from 'lucide-react';
import { useNotification } from '@/hooks/use-notification';

interface TagItem {
  id: string;
  name: string;
  slug: string;
}

interface BulkTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMaterialCount: number;
  onTagged: () => void;
  selectedMaterialIds: string[];
}

export function BulkTagModal({
  isOpen,
  onClose,
  selectedMaterialCount,
  onTagged,
  selectedMaterialIds,
}: BulkTagModalProps) {
  const [tags, setTags] = useState<TagItem[]>([]);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<'add' | 'replace'>('add');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { notifyError, notifySuccess } = useNotification();

  // Fetch available tags when modal opens
  const fetchTags = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/master/tags');
      if (!response.ok) {
        throw new Error('Failed to fetch tags');
      }
      const data = await response.json();
      setTags(data.data || []);
    } catch (error) {
      console.error('Failed to fetch tags:', error);
      notifyError(new Error('Failed to load tags'));
    } finally {
      setIsLoading(false);
    }
  }, [notifyError]);

  useEffect(() => {
    if (isOpen) {
      fetchTags();
    }
  }, [isOpen, fetchTags]);

  const handleSubmit = async () => {
    if (selectedTags.size === 0) {
      notifyError(new Error('Please select at least one tag'));
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/materials/bulk/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          materialIds: selectedMaterialIds,
          tagIds: Array.from(selectedTags),
          mode,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update tags');
      }

      const result = await response.json();

      notifySuccess('タグ更新', `${result.affectedMaterials}件の素材`);

      onTagged();
      handleClose();
    } catch (error) {
      console.error('Failed to update tags:', error);
      notifyError(error instanceof Error ? error : new Error('Failed to update tags'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedTags(new Set());
    setMode('add');
    onClose();
  };

  const toggleTag = (tagId: string) => {
    const newSelected = new Set(selectedTags);
    if (newSelected.has(tagId)) {
      newSelected.delete(tagId);
    } else {
      newSelected.add(tagId);
    }
    setSelectedTags(newSelected);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Tag {selectedMaterialCount} Materials
          </DialogTitle>
          <DialogDescription>Select tags to apply to the selected materials</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Tag Mode</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="add"
                  name="mode"
                  value="add"
                  checked={mode === 'add'}
                  onChange={(e) => setMode(e.target.value as 'add' | 'replace')}
                  className="text-blue-600"
                />
                <Label htmlFor="add" className="font-normal cursor-pointer">
                  Add tags (keep existing tags)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="replace"
                  name="mode"
                  value="replace"
                  checked={mode === 'replace'}
                  onChange={(e) => setMode(e.target.value as 'add' | 'replace')}
                  className="text-blue-600"
                />
                <Label htmlFor="replace" className="font-normal cursor-pointer">
                  Replace tags (remove existing tags)
                </Label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Available Tags</Label>
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : tags.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No tags available. Create tags in the master data section.
              </p>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2 border rounded-md p-3">
                {tags.map((tag) => (
                  <div key={tag.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={tag.id}
                      checked={selectedTags.has(tag.id)}
                      onCheckedChange={() => toggleTag(tag.id)}
                    />
                    <Label htmlFor={tag.id} className="text-sm font-normal cursor-pointer flex-1">
                      {tag.name}
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedTags.size > 0 && (
            <p className="text-sm text-muted-foreground">
              {selectedTags.size} tag{selectedTags.size > 1 ? 's' : ''} selected
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || selectedTags.size === 0}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Applying...
              </>
            ) : (
              'Apply Tags'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
