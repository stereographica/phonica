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
// RadioGroup component not available, using native radio inputs
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, FolderPlus, Search } from 'lucide-react';
import { useNotification } from '@/hooks/use-notification';

interface ProjectItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
  _count?: {
    materials: number;
  };
}

interface BulkProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMaterialCount: number;
  onProjectAdded: () => void;
  selectedMaterialIds: string[];
}

export function BulkProjectModal({
  isOpen,
  onClose,
  selectedMaterialCount,
  onProjectAdded,
  selectedMaterialIds,
}: BulkProjectModalProps) {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<ProjectItem[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { notifyError, notifySuccess, notifyInfo } = useNotification();

  // Fetch available projects when modal opens
  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/projects');
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      const data = await response.json();
      setProjects(data.data || []);
      setFilteredProjects(data.data || []);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      notifyError(new Error('Failed to load projects'));
    } finally {
      setIsLoading(false);
    }
  }, [notifyError]);

  useEffect(() => {
    if (isOpen) {
      fetchProjects();
    }
  }, [isOpen, fetchProjects]);

  // Filter projects based on search query
  useEffect(() => {
    if (searchQuery) {
      const filtered = projects.filter(
        (project) =>
          project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (project.description &&
            project.description.toLowerCase().includes(searchQuery.toLowerCase())),
      );
      setFilteredProjects(filtered);
    } else {
      setFilteredProjects(projects);
    }
  }, [searchQuery, projects]);

  const handleSubmit = async () => {
    if (!selectedProject) {
      notifyError(new Error('Please select a project'));
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/materials/bulk/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          materialIds: selectedMaterialIds,
          projectId: selectedProject,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add materials to project');
      }

      const result = await response.json();

      if (result.addedCount === 0) {
        notifyInfo('情報', result.message || 'All materials are already in this project');
      } else {
        notifySuccess(
          'プロジェクト追加',
          `${result.addedCount}件の素材を${result.project.name}に追加しました`,
        );
      }

      onProjectAdded();
      handleClose();
    } catch (error) {
      console.error('Failed to add materials to project:', error);
      notifyError(error instanceof Error ? error : new Error('Failed to add materials to project'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedProject('');
    setSearchQuery('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5" />
            Add {selectedMaterialCount} Materials to Project
          </DialogTitle>
          <DialogDescription>Select a project to add the selected materials to</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="search">Search Projects</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Available Projects</Label>
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : filteredProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {searchQuery ? 'No projects match your search' : 'No projects available'}
              </p>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2 border rounded-md p-3">
                {filteredProjects.map((project) => (
                  <div key={project.id} className="flex items-start space-x-2">
                    <input
                      type="radio"
                      value={project.id}
                      id={project.id}
                      name="project"
                      checked={selectedProject === project.id}
                      onChange={(e) => setSelectedProject(e.target.value)}
                      className="mt-1 text-blue-600"
                    />
                    <Label
                      htmlFor={project.id}
                      className="text-sm font-normal cursor-pointer flex-1"
                    >
                      <div>
                        <div className="font-medium">{project.name}</div>
                        {project.description && (
                          <div className="text-xs text-muted-foreground">{project.description}</div>
                        )}
                        {project._count && (
                          <div className="text-xs text-muted-foreground">
                            {project._count.materials} materials
                          </div>
                        )}
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !selectedProject}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              'Add to Project'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
