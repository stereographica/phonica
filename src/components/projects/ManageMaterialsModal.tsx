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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
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

// Material state tracking
interface MaterialState {
  originallyInProject: boolean;
  currentlySelected: boolean;
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

  // Track material states: materialId -> { originallyInProject, currentlySelected }
  const [materialStates, setMaterialStates] = useState<Map<string, MaterialState>>(new Map());

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recordedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedTag, setSelectedTag] = useState('');
  const [availableTags, setAvailableTags] = useState<{ id: string; name: string }[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 1,
    totalItems: 0,
  });

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset pagination when search query or tag filter changes
  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [debouncedSearchQuery, selectedTag]);

  // Calculate changes
  const calculateChanges = useCallback(() => {
    const toAdd: string[] = [];
    const toRemove: string[] = [];

    materialStates.forEach((state, materialId) => {
      if (!state.originallyInProject && state.currentlySelected) {
        toAdd.push(materialId);
      } else if (state.originallyInProject && !state.currentlySelected) {
        toRemove.push(materialId);
      }
    });

    return { toAdd, toRemove };
  }, [materialStates]);

  // Fetch materials with project status
  const fetchMaterials = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        includeProjectStatus: projectSlug,
        sortBy,
        sortOrder,
      });

      if (debouncedSearchQuery) {
        params.set('title', debouncedSearchQuery);
      }

      if (selectedTag) {
        params.set('tag', selectedTag);
      }

      const response = await fetch(`/api/materials?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch materials');
      }

      const data: MaterialsApiResponse = await response.json();
      setMaterials(data.data || []);
      setPagination(
        data.pagination || {
          page: 1,
          limit: 10,
          totalPages: 1,
          totalItems: 0,
        },
      );

      // Update material states for current page
      setMaterialStates((prevStates) => {
        const newStates = new Map(prevStates);

        (data.data || []).forEach((material) => {
          const existingState = newStates.get(material.id);

          // Always update the originallyInProject state with the latest from API
          // This ensures we have the correct state when modal is reopened
          newStates.set(material.id, {
            originallyInProject: material.isInProject || false,
            currentlySelected: existingState?.currentlySelected ?? (material.isInProject || false),
          });
        });

        return newStates;
      });
    } catch (error) {
      notifyError(error, { operation: 'fetch', entity: 'materials' });
    } finally {
      setIsLoading(false);
    }
  }, [
    projectSlug,
    pagination.page,
    pagination.limit,
    debouncedSearchQuery,
    sortBy,
    sortOrder,
    selectedTag,
    notifyError,
  ]);

  // Fetch tags
  const fetchTags = useCallback(async () => {
    try {
      const response = await fetch('/api/master/tags');
      if (!response.ok) {
        throw new Error('Failed to fetch tags');
      }
      const data = await response.json();
      setAvailableTags(data.tags || []);
    } catch (error) {
      notifyError(error, { operation: 'fetch', entity: 'tags' });
    }
  }, [notifyError]);

  // Fetch materials when modal opens or search/pagination changes
  useEffect(() => {
    if (isOpen) {
      fetchMaterials();
    }
  }, [isOpen, fetchMaterials]);

  // Fetch tags when modal opens
  useEffect(() => {
    if (isOpen && availableTags.length === 0) {
      fetchTags();
    }
  }, [isOpen, fetchTags, availableTags.length]);

  // Handle checkbox change
  const handleSelectMaterial = (materialId: string, checked: boolean) => {
    setMaterialStates((prevStates) => {
      const newStates = new Map(prevStates);
      const state = newStates.get(materialId);

      if (state) {
        newStates.set(materialId, {
          ...state,
          currentlySelected: checked,
        });
      }

      return newStates;
    });
  };

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    setMaterialStates((prevStates) => {
      const newStates = new Map(prevStates);

      materials.forEach((material) => {
        const state = newStates.get(material.id);
        if (state) {
          newStates.set(material.id, {
            ...state,
            currentlySelected: checked,
          });
        }
      });

      return newStates;
    });
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

  // Get material display state
  const getMaterialDisplayState = (material: Material) => {
    const state = materialStates.get(material.id);
    if (!state) return { isSelected: false, status: '' };

    return {
      isSelected: state.currentlySelected,
      status: getStatusBadge(state),
      rowStyle: getRowStyle(state),
    };
  };

  // Get status badge
  const getStatusBadge = (state: MaterialState) => {
    if (state.originallyInProject && state.currentlySelected) {
      return 'already-added';
    }
    if (!state.originallyInProject && state.currentlySelected) {
      return 'to-add';
    }
    if (state.originallyInProject && !state.currentlySelected) {
      return 'to-remove';
    }
    return '';
  };

  // Get row style
  const getRowStyle = (state: MaterialState) => {
    if (!state.originallyInProject && state.currentlySelected) {
      return 'bg-green-50';
    }
    if (state.originallyInProject && !state.currentlySelected) {
      return 'bg-red-50';
    }
    if (state.originallyInProject) {
      return 'bg-gray-50';
    }
    return '';
  };

  const { toAdd, toRemove } = calculateChanges();
  const hasChanges = toAdd.length > 0 || toRemove.length > 0;

  // Sort options
  const sortOptions = [
    { value: 'recordedAt-desc', label: 'Recorded Date (Newest First)' },
    { value: 'recordedAt-asc', label: 'Recorded Date (Oldest First)' },
    { value: 'title-asc', label: 'Title (A-Z)' },
    { value: 'title-desc', label: 'Title (Z-A)' },
    { value: 'createdAt-desc', label: 'Created Date (Newest First)' },
    { value: 'createdAt-asc', label: 'Created Date (Oldest First)' },
  ];

  const currentSortLabel =
    sortOptions.find((opt) => opt.value === `${sortBy}-${sortOrder}`)?.label || 'Sort';

  // Handle modal close
  const handleModalClose = (open: boolean) => {
    if (!open) {
      // Reset all state when closing
      setSearchQuery('');
      setDebouncedSearchQuery('');
      setSelectedTag('');
      setPagination({
        page: 1,
        limit: 10,
        totalPages: 1,
        totalItems: 0,
      });
      setMaterialStates(new Map());
      setMaterials([]);
      setAvailableTags([]);
    }
    onOpenChange(open);
  };

  // Check if all materials on current page are selected
  const areAllPageMaterialsSelected =
    materials.length > 0 &&
    materials.every((m) => {
      const state = materialStates.get(m.id);
      return state?.currentlySelected || false;
    });

  return (
    <Dialog open={isOpen} onOpenChange={handleModalClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Project Materials</DialogTitle>
          <DialogDescription>
            Check to add materials, uncheck to remove them from the project.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Search and filter controls */}
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search materials by title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Tag filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="min-w-[150px]">
                  {selectedTag
                    ? availableTags.find((t) => t.name === selectedTag)?.name || 'Tag'
                    : 'All Tags'}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSelectedTag('')}>All Tags</DropdownMenuItem>
                {availableTags.map((tag) => (
                  <DropdownMenuItem key={tag.id} onClick={() => setSelectedTag(tag.name)}>
                    {tag.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Sort dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="min-w-[200px]">
                  {currentSortLabel}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {sortOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => {
                      const [field, order] = option.value.split('-');
                      setSortBy(field);
                      setSortOrder(order as 'asc' | 'desc');
                      setPagination((prev) => ({ ...prev, page: 1 }));
                    }}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Materials table */}
          <div className="flex-1 overflow-auto min-h-[500px]">
            {isLoading ? (
              <div className="h-full">
                <div className="animate-pulse">
                  {/* Batch operations bar skeleton */}
                  <div className="flex items-center justify-between px-2 py-2 border-b">
                    <div className="h-4 bg-gray-200 rounded w-32" />
                    <div className="flex gap-2">
                      <div className="h-8 bg-gray-200 rounded w-28" />
                      <div className="h-8 bg-gray-200 rounded w-28" />
                    </div>
                  </div>
                  {/* Table skeleton */}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">
                          <div className="h-4 w-4 bg-gray-200 rounded" />
                        </TableHead>
                        <TableHead>
                          <div className="h-4 bg-gray-200 rounded w-16" />
                        </TableHead>
                        <TableHead>
                          <div className="h-4 bg-gray-200 rounded w-16" />
                        </TableHead>
                        <TableHead>
                          <div className="h-4 bg-gray-200 rounded w-16" />
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.from({ length: 10 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <div className="h-4 w-4 bg-gray-100 rounded" />
                          </TableCell>
                          <TableCell>
                            <div className="h-4 bg-gray-100 rounded w-48" />
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <div className="h-5 bg-gray-100 rounded w-20" />
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <div className="h-5 bg-gray-100 rounded w-12" />
                              <div className="h-5 bg-gray-100 rounded w-16" />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : materials.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No materials found</div>
            ) : (
              <>
                {/* Batch operations */}
                <div className="flex items-center justify-between px-2 py-2 border-b">
                  <div className="text-sm text-muted-foreground">
                    {[...materialStates.values()].filter((s) => s.currentlySelected).length} of{' '}
                    {pagination.totalItems} selected
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleSelectAll(true)}>
                      Select All on Page
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSelectAll(false)}
                      disabled={!areAllPageMaterialsSelected}
                    >
                      Clear Selection
                    </Button>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={areAllPageMaterialsSelected}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tags</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materials.map((material) => {
                      const displayState = getMaterialDisplayState(material);

                      return (
                        <TableRow key={material.id} className={displayState.rowStyle}>
                          <TableCell>
                            <Checkbox
                              checked={displayState.isSelected}
                              onCheckedChange={(checked) =>
                                handleSelectMaterial(material.id, checked as boolean)
                              }
                            />
                          </TableCell>
                          <TableCell>{material.title}</TableCell>
                          <TableCell>
                            {displayState.status === 'already-added' && (
                              <Badge variant="secondary" className="text-xs">
                                Already added
                              </Badge>
                            )}
                            {displayState.status === 'to-add' && (
                              <Badge variant="default" className="text-xs bg-green-600">
                                To add
                              </Badge>
                            )}
                            {displayState.status === 'to-remove' && (
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
                      );
                    })}
                  </TableBody>
                </Table>
              </>
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
