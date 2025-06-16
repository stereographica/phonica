'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { useNotification } from '@/hooks/use-notification';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const projectFormSchema = z.object({
  name: z.string().min(1, { message: 'Project name is required.' }),
  description: z.string().optional(),
});

export type ProjectFormData = z.infer<typeof projectFormSchema>;

interface Project {
  id: string;
  slug: string;
  name: string;
  description: string | null;
}

interface ProjectFormModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  initialData?: Project | null;
  onSuccess?: (project?: Project) => void;
}

export function ProjectFormModal({
  isOpen,
  onOpenChange,
  initialData,
  onSuccess,
}: ProjectFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { notifyError, notifySuccess } = useNotification();

  const isEditMode = !!initialData;

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      description: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && initialData) {
        form.reset({
          name: initialData.name || '',
          description: initialData.description || '',
        });
      } else {
        form.reset({
          name: '',
          description: '',
        });
      }
      setError(null);
      form.clearErrors();
    }
  }, [isOpen, isEditMode, initialData, form]);

  const onSubmit = async (data: ProjectFormData) => {
    setIsSubmitting(true);
    setError(null);

    const projectData = {
      name: data.name,
      description: data.description || null,
    };

    const url = isEditMode && initialData ? `/api/projects/${initialData.slug}` : '/api/projects';
    const method = isEditMode ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const updatedProject = await response.json();

      // 成功通知を表示
      notifySuccess(isEditMode ? 'update' : 'create', 'project');

      if (onSuccess) {
        onSuccess(updatedProject);
      }
      onOpenChange(false);
    } catch (err: unknown) {
      console.error('Failed to save project:', err);
      notifyError(err, { operation: isEditMode ? 'update' : 'create', entity: 'project' });
      if (err instanceof Error) {
        setError(err.message || 'An unknown error occurred.');
      } else {
        setError('An unknown error occurred.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Project' : 'Create New Project'}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update the project details.'
              : 'Create a new project to organize your materials.'}
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Nature Sound Collection" {...field} autoFocus />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your project..."
                      className="resize-none h-24"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Project'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
