'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { PlusCircle, Search, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { MaterialDetailModal } from '@/components/materials/MaterialDetailModal';
import { BulkOperationToolbar } from '@/components/materials/BulkOperationToolbar';
import { BulkDeleteConfirmationModal } from '@/components/materials/BulkDeleteConfirmationModal';
import { BulkTagModal } from '@/components/materials/BulkTagModal';
import { BulkProjectModal } from '@/components/materials/BulkProjectModal';
import { StarRating } from '@/components/ui/star-rating';
import { Material } from '@/types/material';
import { useNotification } from '@/hooks/use-notification';

interface ApiResponse {
  data: Material[];
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalItems: number;
  };
}

function MaterialsPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { notifyError, notifySuccess } = useNotification();

  // State
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMaterialSlug, setSelectedMaterialSlug] = useState<string>('');
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 1,
    totalItems: 0,
  });

  // Selection state
  const [selectedMaterials, setSelectedMaterials] = useState<Set<string>>(new Set());
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkTagModalOpen, setIsBulkTagModalOpen] = useState(false);
  const [isBulkProjectModalOpen, setIsBulkProjectModalOpen] = useState(false);

  // Filter state
  const [tempTitleFilter, setTempTitleFilter] = useState(searchParams.get('title') || '');
  const [tempTagFilter, setTempTagFilter] = useState(searchParams.get('tag') || '');

  // Get current sort params (for future use)
  // const currentSortBy = searchParams.get('sortBy') || 'recordedAt';
  // const currentSortOrder = searchParams.get('sortOrder') || 'desc';

  // Update temp filters when URL changes
  useEffect(() => {
    setTempTitleFilter(searchParams.get('title') || '');
    setTempTagFilter(searchParams.get('tag') || '');
    // Reset navigation state when URL changes
    setIsNavigating(false);
  }, [searchParams]);

  // Update isAllSelected when selectedMaterials or materials change
  useEffect(() => {
    if (materials.length > 0) {
      setIsAllSelected(materials.every((material) => selectedMaterials.has(material.id)));
    } else {
      setIsAllSelected(false);
    }
  }, [selectedMaterials, materials]);

  // Fetch materials
  const fetchMaterials = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Build query params from URL
      const params = new URLSearchParams();

      // Add all search params to the API call
      searchParams.forEach((value, key) => {
        params.set(key, value);
      });

      // Set defaults if not present
      if (!params.has('page')) params.set('page', '1');
      if (!params.has('limit')) params.set('limit', '10');
      if (!params.has('sortBy')) params.set('sortBy', 'recordedAt');
      if (!params.has('sortOrder')) params.set('sortOrder', 'desc');

      const response = await fetch(`/api/materials?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse = await response.json();
      setMaterials(data.data);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setMaterials([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchParams]);

  // Fetch materials when component mounts or searchParams change
  useEffect(() => {
    fetchMaterials();
    // Clear selection when fetching new materials
    setSelectedMaterials(new Set());
  }, [fetchMaterials]);

  // Handlers
  const handleMaterialClick = (slug: string) => {
    setSelectedMaterialSlug(slug);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedMaterialSlug('');
  };

  const handleApplyFilters = () => {
    const params = new URLSearchParams(searchParams);

    // Update or remove title filter
    if (tempTitleFilter) {
      params.set('title', tempTitleFilter);
    } else {
      params.delete('title');
    }

    // Update or remove tag filter
    if (tempTagFilter) {
      params.set('tag', tempTagFilter);
    } else {
      params.delete('tag');
    }

    // Reset to page 1 when filters change
    params.set('page', '1');

    // Update URL
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleFilterKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApplyFilters();
    }
  };

  const handleSortChange = (sortBy: string, sortOrder: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('sortBy', sortBy);
    params.set('sortOrder', sortOrder);

    // Update URL
    router.replace(`${pathname}?${params.toString()}`);
  };

  // Selection handlers
  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedMaterials(new Set());
    } else {
      setSelectedMaterials(new Set(materials.map((m) => m.id)));
    }
  };

  const handleSelectMaterial = (materialId: string) => {
    const newSelected = new Set(selectedMaterials);
    if (newSelected.has(materialId)) {
      newSelected.delete(materialId);
    } else {
      newSelected.add(materialId);
    }
    setSelectedMaterials(newSelected);
  };

  const handlePageChange = (newPage: number) => {
    // Prevent navigation if already navigating or on the requested page
    if (isNavigating) {
      return;
    }

    const currentPage = parseInt(searchParams.get('page') || '1', 10);
    if (currentPage === newPage) {
      return;
    }

    setIsNavigating(true);
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());

    // Update URL
    router.replace(`${pathname}?${params.toString()}`);
  };

  // Check download status with polling
  const checkDownloadStatus = async (requestId: string) => {
    const maxAttempts = 60; // Poll for up to 5 minutes (60 * 5 seconds)
    let attempts = 0;

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/materials/bulk/download?requestId=${requestId}`);

        if (!response.ok) {
          throw new Error('Failed to check download status');
        }

        const status = await response.json();

        if (status.status === 'completed' && status.result) {
          notifySuccess(
            'Download ready',
            'Your ZIP file is ready. The download will start automatically.',
          );

          // Start download
          const downloadUrl = status.result.downloadUrl;
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = status.result.fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          // Clear selection after successful download
          setSelectedMaterials(new Set());
        } else if (status.status === 'failed') {
          notifyError(new Error(status.error || 'Failed to generate ZIP file'));
        } else if (status.status === 'processing' || status.status === 'pending') {
          // Continue polling
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(pollStatus, 5000); // Poll every 5 seconds
          } else {
            notifyError(
              new Error('The download is taking longer than expected. Please try again later.'),
            );
          }
        }
      } catch (error) {
        console.error('Failed to check download status:', error);
        notifyError(new Error('Failed to check download status'));
      }
    };

    pollStatus();
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading materials...</p>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Materials</h1>
        <Link href="/materials/new">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Material
          </Button>
        </Link>
      </div>

      {/* Filter Section */}
      <div className="mb-6 p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label htmlFor="titleFilter" className="block text-sm font-medium mb-1">
              Filter by Title
            </label>
            <Input
              id="titleFilter"
              type="text"
              placeholder="Search by title..."
              value={tempTitleFilter}
              onChange={(e) => setTempTitleFilter(e.target.value)}
              onKeyDown={handleFilterKeyDown}
            />
          </div>
          <div>
            <label htmlFor="tagFilter" className="block text-sm font-medium mb-1">
              Filter by Tag
            </label>
            <Input
              id="tagFilter"
              type="text"
              placeholder="Search by tag..."
              value={tempTagFilter}
              onChange={(e) => setTempTagFilter(e.target.value)}
              onKeyDown={handleFilterKeyDown}
            />
          </div>
          <Button onClick={handleApplyFilters} className="md:self-end">
            <Search className="mr-2 h-4 w-4" />
            Apply Filters
          </Button>
        </div>
      </div>

      {/* Sort Controls */}
      <div className="mb-4 flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          {pagination.totalItems} materials found
          {selectedMaterials.size > 0 && (
            <span className="ml-2 font-medium">• {selectedMaterials.size} selected</span>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <ArrowUpDown className="mr-2 h-4 w-4" />
              Sort by
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleSortChange('recordedAt', 'desc')}>
              Date (Newest First)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSortChange('recordedAt', 'asc')}>
              Date (Oldest First)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSortChange('title', 'asc')}>
              Title (A-Z)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSortChange('title', 'desc')}>
              Title (Z-A)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {materials.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No materials found</div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all materials"
                  />
                </TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Recorded At</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {materials.map((material) => (
                <TableRow
                  key={material.id}
                  className={selectedMaterials.has(material.id) ? 'bg-muted/50' : ''}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedMaterials.has(material.id)}
                      onCheckedChange={() => handleSelectMaterial(material.id)}
                      aria-label={`Select ${material.title}`}
                    />
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => handleMaterialClick(material.slug)}
                      className="text-blue-600 hover:underline text-left"
                    >
                      {material.title}
                    </button>
                  </TableCell>
                  <TableCell>{formatDate(material.recordedAt)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {material.tags.map((tag) => (
                        <span key={tag.id} className="px-2 py-1 text-xs bg-gray-100 rounded">
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StarRating value={material.rating || 0} readOnly size="sm" />
                  </TableCell>
                  <TableCell>{/* Actions will be added later */}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page - 1)}
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
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <MaterialDetailModal
        isOpen={isDetailModalOpen}
        materialSlug={selectedMaterialSlug}
        onClose={handleCloseDetailModal}
        onMaterialDeleted={() => {
          fetchMaterials();
          handleCloseDetailModal();
        }}
        onMaterialEdited={() => {
          fetchMaterials();
        }}
      />

      <BulkOperationToolbar
        selectedCount={selectedMaterials.size}
        onBulkDelete={() => {
          setIsBulkDeleteModalOpen(true);
        }}
        onBulkTag={() => {
          setIsBulkTagModalOpen(true);
        }}
        onBulkAddToProject={() => {
          setIsBulkProjectModalOpen(true);
        }}
        onBulkDownload={async () => {
          try {
            const response = await fetch('/api/materials/bulk/download', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                materialIds: Array.from(selectedMaterials),
              }),
            });

            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error || 'Failed to start download');
            }

            const result = await response.json();

            notifySuccess(
              'Download started',
              `Preparing ZIP file for ${result.materialCount} materials. We'll notify you when it's ready.`,
            );

            // Start polling for status
            checkDownloadStatus(result.requestId);
          } catch (error) {
            console.error('Failed to start bulk download:', error);
            notifyError(error instanceof Error ? error : new Error('Failed to start download'));
          }
        }}
      />

      <BulkDeleteConfirmationModal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        selectedMaterials={materials
          .filter((m) => selectedMaterials.has(m.id))
          .map((m) => ({ id: m.id, title: m.title }))}
        onDeleted={() => {
          setSelectedMaterials(new Set());
          fetchMaterials();
        }}
      />

      <BulkTagModal
        isOpen={isBulkTagModalOpen}
        onClose={() => setIsBulkTagModalOpen(false)}
        selectedMaterialCount={selectedMaterials.size}
        selectedMaterialIds={Array.from(selectedMaterials)}
        onTagged={() => {
          setSelectedMaterials(new Set());
          fetchMaterials();
        }}
      />

      <BulkProjectModal
        isOpen={isBulkProjectModalOpen}
        onClose={() => setIsBulkProjectModalOpen(false)}
        selectedMaterialCount={selectedMaterials.size}
        selectedMaterialIds={Array.from(selectedMaterials)}
        onProjectAdded={() => {
          setSelectedMaterials(new Set());
          fetchMaterials();
        }}
      />
    </div>
  );
}

export default function MaterialsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MaterialsPageContent />
    </Suspense>
  );
}
