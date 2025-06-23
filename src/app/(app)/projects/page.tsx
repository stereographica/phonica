'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PlusCircle, Search, ArrowUpDown, ChevronLeft, ChevronRight, Folder } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale/ja';
import { ProjectFormModal } from '@/components/projects/ProjectFormModal';

interface Project {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    materials: number;
  };
}

interface ApiResponse {
  data: Project[];
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalItems: number;
  };
}

function ProjectsPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // State
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    totalPages: 1,
    totalItems: 0,
  });

  // Filter state
  const [tempNameFilter, setTempNameFilter] = useState(searchParams.get('name') || '');

  // Update temp filters when URL changes
  useEffect(() => {
    setTempNameFilter(searchParams.get('name') || '');
    // Reset navigation state when URL changes
    setIsNavigating(false);
  }, [searchParams]);

  // Fetch projects
  const fetchProjects = useCallback(async () => {
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
      if (!params.has('limit')) params.set('limit', '12');
      if (!params.has('sortBy')) params.set('sortBy', 'updatedAt');
      if (!params.has('sortOrder')) params.set('sortOrder', 'desc');

      const response = await fetch(`/api/projects?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse = await response.json();
      setProjects(data.data);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchParams]);

  // Fetch projects when component mounts or searchParams change
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Handlers
  const handleProjectClick = (slug: string) => {
    router.push(`/projects/${slug}`);
  };

  const handleApplyFilters = () => {
    const params = new URLSearchParams(searchParams);

    // Update or remove name filter
    if (tempNameFilter) {
      params.set('name', tempNameFilter);
    } else {
      params.delete('name');
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

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading projects...</p>
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
        <h1 className="text-3xl font-bold">Projects</h1>
        <Button data-testid="new-project-button" onClick={() => setIsProjectModalOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Filter Section */}
      <div className="mb-6 p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div>
            <label htmlFor="nameFilter" className="block text-sm font-medium mb-1">
              Filter by Name
            </label>
            <Input
              id="nameFilter"
              type="text"
              placeholder="Search by project name..."
              value={tempNameFilter}
              onChange={(e) => setTempNameFilter(e.target.value)}
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
        <div className="text-sm text-muted-foreground">{pagination.totalItems} projects found</div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <ArrowUpDown className="mr-2 h-4 w-4" />
              Sort by
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleSortChange('updatedAt', 'desc')}>
              Updated (Newest First)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSortChange('updatedAt', 'asc')}>
              Updated (Oldest First)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSortChange('name', 'asc')}>
              Name (A-Z)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSortChange('name', 'desc')}>
              Name (Z-A)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSortChange('createdAt', 'desc')}>
              Created (Newest First)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSortChange('createdAt', 'asc')}>
              Created (Oldest First)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No projects found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleProjectClick(project.slug)}
              data-testid={`project-card-${project.slug}`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <Folder className="h-5 w-5 text-muted-foreground mt-1" />
                  <div className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(project.updatedAt), {
                      addSuffix: true,
                      locale: ja,
                    })}
                  </div>
                </div>
                <CardTitle className="mt-2">{project.name}</CardTitle>
                {project.description && (
                  <CardDescription className="line-clamp-2">{project.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{project._count?.materials || 0} materials</span>
                </div>
              </CardContent>
            </Card>
          ))}
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

      <ProjectFormModal
        isOpen={isProjectModalOpen}
        onOpenChange={setIsProjectModalOpen}
        onSuccess={fetchProjects}
      />
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProjectsPageContent />
    </Suspense>
  );
}
