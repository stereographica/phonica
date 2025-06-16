'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNotification } from '@/hooks/use-notification';

interface Material {
  id: string;
  slug: string;
  title: string;
  recordedAt: string;
  tags: { id: string; name: string; slug: string }[];
  isInProject?: boolean;
}

interface MaterialsApiResponse {
  data: Material[];
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalItems: number;
  };
}

interface ManageMaterialsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  projectSlug: string;
  onSuccess?: () => void;
}

export function ManageMaterialsModal({
  isOpen,
  onOpenChange,
  projectSlug,
  onSuccess,
}: ManageMaterialsModalProps) {
  const { notifyError, notifySuccess } = useNotification();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMaterials, setSelectedMaterials] = useState<Set<string>>(new Set());
  const [originalSelection, setOriginalSelection] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 1,
    totalItems: 0,
  });

  // Calculate changes
  const calculateChanges = useCallback(() => {
    const toAdd: string[] = [];
    const toRemove: string[] = [];

    materials.forEach((material) => {
      const wasSelected = originalSelection.has(material.id);
      const isSelected = selectedMaterials.has(material.id);

      if (!wasSelected && isSelected) {
        toAdd.push(material.id);
      } else if (wasSelected && !isSelected) {
        toRemove.push(material.id);
      }
    });

    return { toAdd, toRemove };
  }, [materials, selectedMaterials, originalSelection]);

  // Fetch materials with project status
  const fetchMaterials = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        includeProjectStatus: projectSlug,
      });

      if (searchQuery) {
        params.set('title', searchQuery);
      }

      const response = await fetch(`/api/materials?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch materials');
      }

      const data: MaterialsApiResponse = await response.json();
      setMaterials(data.data);
      setPagination(data.pagination);

      // Set initial selection for materials already in project
      if (pagination.page === 1 && originalSelection.size === 0) {
        const inProjectIds = data.data.filter((m) => m.isInProject).map((m) => m.id);
        setSelectedMaterials(new Set(inProjectIds));
        setOriginalSelection(new Set(inProjectIds));
      }
    } catch (error) {
      notifyError(error, { operation: 'fetch', entity: 'materials' });
    } finally {
      setIsLoading(false);
    }
  }, [
    projectSlug,
    pagination.page,
    pagination.limit,
    searchQuery,
    notifyError,
    originalSelection.size,
  ]);

  // Fetch materials when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchMaterials();
    }
  }, [isOpen, fetchMaterials]);

  // Handle checkbox change
  const handleSelectMaterial = (materialId: string, checked: boolean) => {
    const newSelection = new Set(selectedMaterials);
    if (checked) {
      newSelection.add(materialId);
    } else {
      newSelection.delete(materialId);
    }
    setSelectedMaterials(newSelection);
  };

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = materials.map((m) => m.id);
      setSelectedMaterials(new Set([...selectedMaterials, ...allIds]));
    } else {
      const pageIds = new Set(materials.map((m) => m.id));
      const newSelection = new Set(Array.from(selectedMaterials).filter((id) => !pageIds.has(id)));
      setSelectedMaterials(newSelection);
    }
  };

  // Apply changes
  const handleApplyChanges = async () => {
    const { toAdd, toRemove } = calculateChanges();

    if (toAdd.length === 0 && toRemove.length === 0) {
      onOpenChange(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectSlug}/materials/batch-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          add: toAdd,
          remove: toRemove,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update project materials');
      }

      notifySuccess('update', `materials (${toAdd.length} added, ${toRemove.length} removed)`);

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      notifyError(error, { operation: 'update', entity: 'project materials' });
    } finally {
      setIsLoading(false);
    }
  };

  // Get row style based on material state
  const getMaterialRowStyle = (material: Material) => {
    const wasInProject = originalSelection.has(material.id);
    const isSelected = selectedMaterials.has(material.id);

    if (!wasInProject && isSelected) {
      return 'bg-green-50';
    }
    if (wasInProject && !isSelected) {
      return 'bg-red-50';
    }
    if (material.isInProject) {
      return 'bg-gray-50';
    }
    return '';
  };

  const { toAdd, toRemove } = calculateChanges();
  const hasChanges = toAdd.length > 0 || toRemove.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Project Materials</DialogTitle>
          <DialogDescription>
            Check to add materials, uncheck to remove them from the project.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search materials by title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Materials table */}
          <div className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="text-center py-8">Loading materials...</div>
            ) : materials.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No materials found</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={
                          materials.length > 0 &&
                          materials.every((m) => selectedMaterials.has(m.id))
                        }
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tags</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materials.map((material) => (
                    <TableRow key={material.id} className={getMaterialRowStyle(material)}>
                      <TableCell>
                        <Checkbox
                          checked={selectedMaterials.has(material.id)}
                          onCheckedChange={(checked) =>
                            handleSelectMaterial(material.id, checked as boolean)
                          }
                        />
                      </TableCell>
                      <TableCell>{material.title}</TableCell>
                      <TableCell>
                        {material.isInProject && (
                          <Badge variant="secondary" className="text-xs">
                            Already added
                          </Badge>
                        )}
                        {!originalSelection.has(material.id) &&
                          selectedMaterials.has(material.id) && (
                            <Badge variant="default" className="text-xs bg-green-600">
                              To add
                            </Badge>
                          )}
                        {originalSelection.has(material.id) &&
                          !selectedMaterials.has(material.id) && (
                            <Badge variant="destructive" className="text-xs">
                              To remove
                            </Badge>
                          )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {material.tags.map((tag) => (
                            <Badge key={tag.id} variant="outline" className="text-xs">
                              {tag.name}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 border-t pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              <div className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Footer with changes summary */}
        <div className="flex justify-between items-center border-t pt-4">
          <div className="text-sm text-muted-foreground">
            {hasChanges && (
              <span>
                Changes: {toAdd.length > 0 && `${toAdd.length} to add`}
                {toAdd.length > 0 && toRemove.length > 0 && ', '}
                {toRemove.length > 0 && `${toRemove.length} to remove`}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleApplyChanges} disabled={!hasChanges || isLoading}>
              Apply Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
