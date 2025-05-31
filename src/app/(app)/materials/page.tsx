'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, ChevronDown, ChevronUp, Search, Trash2 } from 'lucide-react';
import { MaterialDetailModal } from '@/components/materials/MaterialDetailModal';
import { DeleteConfirmationModal } from '@/components/materials/DeleteConfirmationModal';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Input } from '@/components/ui/input';
import { useToast } from "@/hooks/use-toast";
import { Material, Tag } from "@/types/material";
import { PaginationState } from '@tanstack/react-table';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Currently unused for tag filter

// 表示用の素材データの型 (Prismaの型とは異なる場合がある)
// Prisma の Material モデルに合わせて調整
// interface ApiResponse {
//   data: Material[];
//   pagination: {
//     page: number;
//     limit: number;
//     totalPages: number;
//     totalItems: number;
//   };
// }

// const DEBOUNCE_DELAY = 500; // Unused

function MaterialsPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Delete confirmation modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState<Material | null>(null);

  // Pagination state
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: searchParams.get('page') ? Number(searchParams.get('page')) - 1 : 0,
    pageSize: searchParams.get('limit') ? Number(searchParams.get('limit')) : 10,
  });
  // const [totalItems, setTotalItems] = useState(0); // Unused for now
  const [totalPages, setTotalPages] = useState(0);

  // Sorting state
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'recordedAt');
  const [sortOrder, setSortOrder] = useState(searchParams.get('sortOrder') || 'desc');

  // Filtering state
  const [titleFilter, setTitleFilter] = useState(searchParams.get('title') || '');
  const [tagFilter, setTagFilter] = useState(searchParams.get('tag') || '');
  const [tempTitleFilter, setTempTitleFilter] = useState(searchParams.get('title') || '');
  const [tempTagFilter, setTempTagFilter] = useState(searchParams.get('tag') || '');

  const lastReplacedUrlParams = useRef<string | null>(null);

  const fetchMaterials = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.set('page', String(pagination.pageIndex + 1));
    params.set('limit', String(pagination.pageSize));
    if (titleFilter) params.set('title', titleFilter);
    if (tagFilter) params.set('tag', tagFilter);
    if (sortBy) params.set('sortBy', sortBy);
    if (sortOrder) params.set('sortOrder', sortOrder);

    // console.log('Fetching materials with params:', params.toString());

    try {
      const response = await fetch(`/api/materials?${params.toString()}`);
      if (!response.ok) {
        let errorText = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorText = errorData.error || errorText;
        } catch (e: unknown) {
          const message = (e instanceof Error && e.message) ? e.message : String(e);
          console.warn(`Failed to parse error JSON: ${message}`);
        }
        throw new Error(errorText);
      }
      const data = await response.json();
      // console.log('Fetched data:', data);
      setMaterials(data.data || []);
      // setTotalItems(data.pagination.totalItems || 0); // Still unused
      setTotalPages(data.pagination.totalPages || 0);
    } catch (err) {
      // console.error('Error in fetchMaterials:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
      setMaterials([]); // Clear materials on error
      setTotalPages(0); // Reset total pages on error
    } finally {
      setIsLoading(false);
    }
  }, [pagination.pageIndex, pagination.pageSize, titleFilter, tagFilter, sortBy, sortOrder]);

  // useEffect to update URL when filters or pagination change
  useEffect(() => {
    const newUrlParams = new URLSearchParams();
    newUrlParams.set('page', String(pagination.pageIndex + 1));
    newUrlParams.set('limit', String(pagination.pageSize));
    if (titleFilter) newUrlParams.set('title', titleFilter); else newUrlParams.delete('title');
    if (tagFilter) newUrlParams.set('tag', tagFilter); else newUrlParams.delete('tag');
    if (sortBy) newUrlParams.set('sortBy', sortBy); else newUrlParams.delete('sortBy');
    if (sortOrder) newUrlParams.set('sortOrder', sortOrder); else newUrlParams.delete('sortOrder');

    const newSearchQuery = newUrlParams.toString();
    const currentSearchQueryFromHook = searchParams.toString();

    // Only replace if the new query is different from the current one from useSearchParams
    // AND it's different from the last one we manually set via router.replace
    if (newSearchQuery !== currentSearchQueryFromHook && newSearchQuery !== lastReplacedUrlParams.current) {
      // console.log('[DEBUG useEffect router.replace] Replacing URL. New params:', newSearchQuery, 'Old params from hook:', currentSearchQueryFromHook, 'Last replaced:', lastReplacedUrlParams.current);
      router.replace(`${pathname}?${newSearchQuery}`);
      lastReplacedUrlParams.current = newSearchQuery; // Store what we just set
    }
  }, [pagination, titleFilter, tagFilter, sortBy, sortOrder, router, pathname, searchParams]);

  // useEffect to fetch materials when searchParams change (i.e., URL changes)
  useEffect(() => {
    // console.log("searchParams changed, fetching materials:", searchParams.toString());
    fetchMaterials();
  }, [fetchMaterials]); // fetchMaterials の依存配列が実質的なトリガーとなる

  const handleSort = (newSortBy: string) => {
    if (sortBy === newSortBy) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
    setPagination((prev: PaginationState) => ({ ...prev, pageIndex: 0 }));
  };

  const handlePageChange = (newPage: number) => {
    // pageIndex is 0-based, newPage is 1-based
    if (newPage -1 >= 0 && newPage -1 < totalPages) {
      setPagination((prev: PaginationState) => ({ ...prev, pageIndex: newPage -1 }));
    }
  };
  
  const handleTitleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempTitleFilter(e.target.value);
  };

  const handleTagFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempTagFilter(e.target.value);
  };

  const applyFilters = () => {
    setPagination((prev: PaginationState) => ({ ...prev, pageIndex: 0 }));
    setTitleFilter(tempTitleFilter);
    setTagFilter(tempTagFilter);
    // fetchMaterials will be called by the useEffect watching titleFilter and tagFilter
  };

  const handleViewDetails = (material: Material) => {
    setSelectedMaterial(material);
    setIsDetailModalOpen(true);
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedMaterial(null);
  };

  const openDeleteModal = (material: Material) => {
    setMaterialToDelete(material);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setMaterialToDelete(null);
  };

  const handleDeleteMaterial = async () => {
    if (!materialToDelete) return;

    try {
      const response = await fetch(`/api/materials/${materialToDelete.slug}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete material');
      }
      
      toast({
        title: "成功",
        description: `素材「${materialToDelete.title}」を削除しました。`,
      });
      // Optimistic update (optional):
      // setMaterials(prevMaterials => prevMaterials.filter(m => m.id !== materialToDelete.id));
      // Or refetch:
      fetchMaterials(); // Refetch to update the list
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage); // Display error to user
      toast({
        title: "エラー",
        description: `素材の削除に失敗しました: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      closeDeleteModal();
    }
  };

  // Render functions for pagination (simplified for brevity, shadcn/ui has more robust components)
  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const pageNumbers = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, pagination.pageIndex + 1 - Math.floor(maxPagesToShow / 2));
    const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }
    
    return (
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              href="#"
              onClick={(e) => { e.preventDefault(); handlePageChange(pagination.pageIndex + 1 - 1); }}
              className={pagination.pageIndex === 0 ? 'pointer-events-none opacity-50' : ''}
            />
          </PaginationItem>
          {startPage > 1 && (
            <>
             <PaginationItem>
                <PaginationLink href="#" onClick={(e) => { e.preventDefault(); handlePageChange(1); }}>1</PaginationLink>
              </PaginationItem>
              {startPage > 2 && <PaginationItem><PaginationEllipsis /></PaginationItem>}
            </>
          )}
          {pageNumbers.map(number => (
            <PaginationItem key={number}>
              <PaginationLink 
                href="#" 
                onClick={(e) => { e.preventDefault(); handlePageChange(number); }}
                isActive={pagination.pageIndex + 1 === number}
              >
                {number}
              </PaginationLink>
            </PaginationItem>
          ))}
          {endPage < totalPages && (
            <>
              {endPage < totalPages -1 && <PaginationItem><PaginationEllipsis /></PaginationItem>}
              <PaginationItem>
                <PaginationLink href="#" onClick={(e) => { e.preventDefault(); handlePageChange(totalPages); }}>{totalPages}</PaginationLink>
              </PaginationItem>
            </>
          )}
          <PaginationItem>
            <PaginationNext 
              href="#"
              onClick={(e) => { e.preventDefault(); handlePageChange(pagination.pageIndex + 1 + 1); }}
              className={pagination.pageIndex === totalPages - 1 ? 'pointer-events-none opacity-50' : ''}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><p>Loading materials...</p></div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Materials</h1>
        <Link href="/materials/new">
          <Button variant="default">
            <PlusCircle className="mr-2 h-4 w-4" /> New Material
          </Button>
        </Link>
      </div>

      <div className="mb-6 p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label htmlFor="titleFilter" className="block text-sm font-medium mb-1">Filter by Title</label>
            <Input 
              id="titleFilter"
              type="text" 
              placeholder="Search by title..." 
              value={tempTitleFilter} 
              onChange={handleTitleFilterChange} 
            />
          </div>
          <div>
            <label htmlFor="tagFilter" className="block text-sm font-medium mb-1">Filter by Tag</label>
             {/* For now, a simple input. Could be replaced with a Select with tag options later */}
            <Input 
              id="tagFilter"
              type="text" 
              placeholder="Search by tag..." 
              value={tempTagFilter} 
              onChange={handleTagFilterChange} 
            />
            {/* Example for Select if tags are fetched for dropdown 
            <Select onValueChange={handleTagFilterChange} value={tagFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by tag..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nature">Nature</SelectItem>
                <SelectItem value="urban">Urban</SelectItem>
                <SelectItem value="ambient">Ambient</SelectItem>
              </SelectContent>
            </Select> 
            */}
          </div>
          <Button onClick={applyFilters} className="md:self-end">
            <Search className="mr-2 h-4 w-4" /> Apply Filters
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 border border-red-400 rounded-md">
          <p>Error: {error}</p>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead onClick={() => handleSort('title')} className="cursor-pointer">
                Title {sortBy === 'title' && (sortOrder === 'asc' ? <ChevronUp className="inline h-4 w-4" /> : <ChevronDown className="inline h-4 w-4" />)}
              </TableHead>
              <TableHead onClick={() => handleSort('recordedAt')} className="cursor-pointer">
                Recorded Date {sortBy === 'recordedAt' && (sortOrder === 'asc' ? <ChevronUp className="inline h-4 w-4" /> : <ChevronDown className="inline h-4 w-4" />)}
              </TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {materials.length > 0 ? (
              materials.map((material) => (
                <TableRow key={material.id}>
                  <TableCell className="font-medium">
                    <span 
                      onClick={() => handleViewDetails(material)} 
                      className="hover:underline cursor-pointer"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleViewDetails(material); }}
                    >
                      {material.title}
                    </span>
                  </TableCell>
                  <TableCell>{new Date(material.recordedAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {material.tags.slice(0, 2).map((tag: Tag) => (
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
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>アクション</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() => router.push(`/materials/${material.slug}/edit`)}
                        >
                          編集
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => openDeleteModal(material)}
                          className="text-red-600 focus:text-red-600 focus:bg-red-50"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          削除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24">
                  No materials found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-6 flex justify-center">
        {renderPagination()}
      </div>

      {selectedMaterial && (
        <MaterialDetailModal
          materialSlug={selectedMaterial.slug}
          isOpen={isDetailModalOpen}
          onClose={closeDetailModal}
          onMaterialDeleted={() => {
            fetchMaterials(); // Refetch materials after deletion
            closeDetailModal(); // Ensure detail modal is closed
          }}
          onMaterialEdited={(slug) => {
            router.push(`/materials/${slug}/edit`);
            closeDetailModal(); // Ensure detail modal is closed
          }}
        />
      )}
      {materialToDelete && (
        <DeleteConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={closeDeleteModal}
          onConfirm={handleDeleteMaterial}
          materialTitle={materialToDelete.title}
        />
      )}
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
