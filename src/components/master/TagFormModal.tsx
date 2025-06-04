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
import type { Tag } from '@prisma/client';

const tagFormSchema = z.object({
  name: z.string().min(1, { message: 'Tag name is required.' }),
});

export type TagFormData = z.infer<typeof tagFormSchema>;

interface TagFormModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  initialData?: Tag | null;
  onSuccess?: () => void;
}

export function TagFormModal({ isOpen, onOpenChange, initialData, onSuccess }: TagFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { notifyError, notifySuccess } = useNotification();

  const isEditMode = !!initialData;

  const form = useForm<TagFormData>({
    resolver: zodResolver(tagFormSchema),
    defaultValues: {
      name: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && initialData) {
        form.reset({
          name: initialData.name || '',
        });
      } else {
        form.reset({
          name: '',
        });
      }
      setError(null);
      form.clearErrors();
    }
  }, [isOpen, isEditMode, initialData, form]);

  const onSubmit = async (data: TagFormData) => {
    setIsSubmitting(true);
    setError(null);

    const tagData = {
      name: data.name,
    };

    const url =
      isEditMode && initialData ? `/api/master/tags/${initialData.id}` : '/api/master/tags';
    const method = isEditMode ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tagData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      // 成功通知を表示
      notifySuccess(isEditMode ? 'update' : 'create', 'tag');

      if (onSuccess) {
        onSuccess();
      }
      onOpenChange(false);
    } catch (err: unknown) {
      console.error('Failed to save tag:', err);
      notifyError(err, { operation: isEditMode ? 'update' : 'create', entity: 'tag' });
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Tag' : 'Add New Tag'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Update the tag name.' : 'Create a new tag to categorize your materials.'}
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
                <FormItem className="grid grid-cols-4 items-center gap-4">
                  <FormLabel className="text-right">Name</FormLabel>
                  <FormControl className="col-span-3">
                    <Input placeholder="e.g., Nature, Urban, Music" {...field} autoFocus />
                  </FormControl>
                  <FormMessage className="col-span-4 text-right" />
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
              <Button type="submit" disabled={isSubmitting || !form.formState.isValid}>
                {isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Add Tag'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
