'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useParams, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Settings,
  X,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
} from 'lucide-react';
import { ProjectFormModal } from '@/components/projects/ProjectFormModal';
import { ManageMaterialsModal } from '@/components/projects/ManageMaterialsModal';
import { useNotification } from '@/hooks/use-notification';

interface Project {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Material {
  id: string;
  slug: string;
  title: string;
  recordedAt: string;
  tags: { id: string; name: string; slug: string }[];
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

function ProjectDetailContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { notifyError, notifySuccess } = useNotification();

  const projectSlug = typeof params.slug === 'string' ? params.slug : '';

  // State
  const [project, setProject] = useState<Project | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMaterialsLoading, setIsMaterialsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isManageMaterialsModalOpen, setIsManageMaterialsModalOpen] = useState(false);
  const [selectedMaterials, setSelectedMaterials] = useState<Set<string>>(new Set());
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 1,
    totalItems: 0,
  });

  // Fetch project details
  const fetchProject = useCallback(async () => {
    if (!projectSlug) return;

    try {
      const response = await fetch(`/api/projects/${projectSlug}`);

      if (!response || !response.ok) {
        if (response?.status === 404) {
          throw new Error('Project not found');
        }
        throw new Error(`HTTP error! status: ${response?.status || 'unknown'}`);
      }

      const data = await response.json();
      setProject(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      notifyError(err, { operation: 'fetch', entity: 'project' });
    } finally {
      setIsLoading(false);
    }
  }, [projectSlug, notifyError]);

  // Fetch project materials
  const fetchProjectMaterials = useCallback(async () => {
    if (!project) return;

    setIsMaterialsLoading(true);

    try {
      const params = new URLSearchParams();

      // Add pagination params from URL
      const page = searchParams.get('page') || '1';
      const limit = searchParams.get('limit') || '10';
      params.set('page', page);
      params.set('limit', limit);

      const response = await fetch(`/api/projects/${projectSlug}/materials?${params.toString()}`);

      if (!response || !response.ok) {
        throw new Error(`HTTP error! status: ${response?.status || 'unknown'}`);
      }

      const data: MaterialsApiResponse = await response.json();
      setMaterials(data.data);
      setPagination(data.pagination);
    } catch (err) {
      notifyError(err, { operation: 'fetch', entity: 'materials' });
    } finally {
      setIsMaterialsLoading(false);
    }
  }, [project, searchParams, notifyError, projectSlug]);

  // Initial fetch
  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  // Fetch materials when project is loaded
  useEffect(() => {
    if (project) {
      fetchProjectMaterials();
    }
  }, [project, fetchProjectMaterials]);

  // Handlers
  const handleDeleteProject = async () => {
    if (!project) return;

    if (!confirm('Are you sure you want to delete this project?')) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectSlug}`, {
        method: 'DELETE',
      });

      if (!response || !response.ok) {
        throw new Error(`HTTP error! status: ${response?.status || 'unknown'}`);
      }

      notifySuccess('delete', 'project');
      router.push('/projects');
    } catch (err) {
      notifyError(err, { operation: 'delete', entity: 'project' });
    }
  };

  const handleRemoveMaterials = async () => {
    if (!project || selectedMaterials.size === 0) return;

    const materialIds = Array.from(selectedMaterials);

    try {
      for (const materialId of materialIds) {
        const response = await fetch(`/api/projects/${projectSlug}/materials/${materialId}`, {
          method: 'DELETE',
        });

        if (!response || !response.ok) {
          throw new Error(`Failed to remove material ${materialId}`);
        }
      }

      notifySuccess('delete', 'materials from project');
      setSelectedMaterials(new Set());
      fetchProjectMaterials();
    } catch (err) {
      notifyError(err, { operation: 'remove', entity: 'materials' });
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedMaterials(new Set(materials.map((m) => m.id)));
    } else {
      setSelectedMaterials(new Set());
    }
  };

  const handleSelectMaterial = (materialId: string, checked: boolean) => {
    const newSelection = new Set(selectedMaterials);
    if (checked) {
      newSelection.add(materialId);
    } else {
      newSelection.delete(materialId);
    }
    setSelectedMaterials(newSelection);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    router.replace(`${pathname}?${params.toString()}`);
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

  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading project...</p>
      </div>
    );
  }

  // Error state
  if (error || !project) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-red-500">{error || 'Project not found'}</div>
        <Link href="/projects">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      {/* Header */}
      <div className="mb-6">
        <Link href="/projects">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Button>
        </Link>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">{project.name}</h1>
            {project.description && <p className="text-muted-foreground">{project.description}</p>}
            <div className="text-sm text-muted-foreground mt-2">
              Created: {formatDate(project.createdAt)} | Updated: {formatDate(project.updatedAt)}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditModalOpen(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Project
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDeleteProject} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Materials Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Materials ({pagination.totalItems})</h2>
          <div className="flex gap-2">
            {selectedMaterials.size > 0 && (
              <Button variant="destructive" size="sm" onClick={handleRemoveMaterials}>
                <X className="mr-2 h-4 w-4" />
                Remove Selected ({selectedMaterials.size})
              </Button>
            )}
            <Button size="sm" onClick={() => setIsManageMaterialsModalOpen(true)}>
              <Settings className="mr-2 h-4 w-4" />
              Manage Materials
            </Button>
          </div>
        </div>

        {isMaterialsLoading ? (
          <div className="text-center py-8">Loading materials...</div>
        ) : materials.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No materials in this project yet</div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={
                          materials.length > 0 && selectedMaterials.size === materials.length
                        }
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Recorded At</TableHead>
                    <TableHead>Tags</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materials.map((material) => (
                    <TableRow key={material.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedMaterials.has(material.id)}
                          onCheckedChange={(checked) =>
                            handleSelectMaterial(material.id, checked as boolean)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/materials/${material.slug}/edit`}
                          className="text-blue-600 hover:underline"
                        >
                          {material.title}
                        </Link>
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-4">
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
          </>
        )}
      </div>

      <ProjectFormModal
        isOpen={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        initialData={project}
        onSuccess={(updatedProject) => {
          // スラッグが変更された場合は新しいURLにリダイレクト
          if (updatedProject && updatedProject.slug !== projectSlug) {
            router.push(`/projects/${updatedProject.slug}`);
          } else {
            fetchProject();
          }
          setIsEditModalOpen(false);
        }}
      />

      <ManageMaterialsModal
        isOpen={isManageMaterialsModalOpen}
        onOpenChange={setIsManageMaterialsModalOpen}
        projectSlug={projectSlug}
        onSuccess={fetchProjectMaterials}
      />
    </div>
  );
}

export default function ProjectDetailPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProjectDetailContent />
    </Suspense>
  );
}
