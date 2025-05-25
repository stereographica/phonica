'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import { MoreHorizontal, PlusCircle, Eye, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { MaterialDetailModal } from '@/components/materials/MaterialDetailModal';
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
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Currently unused for tag filter

// 表示用の素材データの型 (Prismaの型とは異なる場合がある)
// Prisma の Material モデルに合わせて調整
interface Material {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  recordedDate: Date; // PrismaからはDate型で取得される
  categoryName: string | null; // category テーブルとのリレーションを想定
  tags: { name: string }[]; // tags テーブルとのリレーションを想定 (多対多)
  filePath: string;
  // 必要に応じて他のフィールドを追加 (例: waveformData, durationSeconds)
}

// interface Tag { // Removed unused Tag interface
//   id: string;
//   name: string;
//   slug: string;
// }

// interface Equipment { // Removed unused Equipment interface
//   id: string;
//   name: string;
//   type: string;
// }

interface ApiResponse {
  data: Material[];
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalItems: number;
  };
}

const MaterialsPage: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, /* setLimit */] = useState(Number(searchParams.get('limit')) || 10); // Commented out setLimit, and removed eslint-disable line

  // Sorting state
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'createdAt');
  const [sortOrder, setSortOrder] = useState(searchParams.get('sortOrder') || 'desc');

  // Filtering state
  const [titleFilter, setTitleFilter] = useState(searchParams.get('title') || '');
  const [tagFilter, setTagFilter] = useState(searchParams.get('tag') || '');
  const [tempTitleFilter, setTempTitleFilter] = useState(searchParams.get('title') || '');
  const [tempTagFilter, setTempTagFilter] = useState(searchParams.get('tag') || '');

  const fetchMaterials = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', limit.toString());
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);
      if (titleFilter) params.append('title', titleFilter);
      if (tagFilter) params.append('tag', tagFilter);

      // Update URL query parameters
      const currentParams = new URLSearchParams(searchParams.toString());
      if (params.toString() !== currentParams.toString()) {
        router.replace(`${pathname}?${params.toString()}`);
      }

      const response = await fetch(`/api/materials?${params.toString()}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch materials');
      }
      const result: ApiResponse = await response.json();
      setMaterials(result.data);
      setTotalPages(result.pagination.totalPages);
      // setCurrentPage(result.pagination.page); // APIから返されるページ番号を使うか、現在のstateを維持するか

    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
      setMaterials([]); // Clear data on error
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, limit, sortBy, sortOrder, titleFilter, tagFilter, router, pathname, searchParams]);

  useEffect(() => {
    // Initialize filters from URL on first load
    const initialTitle = searchParams.get('title') || '';
    const initialTag = searchParams.get('tag') || '';
    setTitleFilter(initialTitle);
    setTagFilter(initialTag);
    setTempTitleFilter(initialTitle);
    setTempTagFilter(initialTag);
    setCurrentPage(Number(searchParams.get('page')) || 1);
    setSortBy(searchParams.get('sortBy') || 'createdAt');
    setSortOrder(searchParams.get('sortOrder') || 'desc');
  }, [searchParams]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  const handleSort = (newSortBy: string) => {
    if (sortBy === newSortBy) {
      setSortOrder(prevOrder => prevOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
    setCurrentPage(1); // Reset to first page on sort change
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };
  
  const handleTitleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempTitleFilter(e.target.value);
  };

  const handleTagFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempTagFilter(e.target.value);
  };

  const applyFilters = () => {
    setCurrentPage(1); // Reset to first page when applying new filters
    setTitleFilter(tempTitleFilter);
    setTagFilter(tempTagFilter);
    // fetchMaterials will be called by the useEffect watching titleFilter and tagFilter
  };

  const handleViewDetails = (material: Material) => {
    setSelectedMaterial(material);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedMaterial(null);
  };

  // Render functions for pagination (simplified for brevity, shadcn/ui has more robust components)
  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const pageNumbers = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
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
              onClick={(e) => { e.preventDefault(); handlePageChange(currentPage - 1); }}
              className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
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
                isActive={currentPage === number}
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
              onClick={(e) => { e.preventDefault(); handlePageChange(currentPage + 1); }}
              className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
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
              <TableHead onClick={() => handleSort('recordedDate')} className="cursor-pointer">
                Recorded Date {sortBy === 'recordedDate' && (sortOrder === 'asc' ? <ChevronUp className="inline h-4 w-4" /> : <ChevronDown className="inline h-4 w-4" />)}
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
                    {material.title}
                  </TableCell>
                  <TableCell>{new Date(material.recordedDate).toLocaleDateString()}</TableCell>
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
                        <DropdownMenuItem onClick={() => handleViewDetails(material)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/materials/${material.slug}/edit`}>Edit</Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          Delete {/* TODO: 削除確認モーダル表示 */}
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

      {isModalOpen && selectedMaterial && (
        <MaterialDetailModal
          materialSlug={selectedMaterial.slug}
          isOpen={isModalOpen}
          onClose={closeModal}
        />
      )}
    </div>
  );
};

export default MaterialsPage; 
