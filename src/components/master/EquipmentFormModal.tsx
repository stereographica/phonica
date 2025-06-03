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
} from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Equipment } from '@prisma/client';

const equipmentFormSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  type: z.string().min(1, { message: "Type is required." }),
  manufacturer: z.string().nullable().optional(),
  memo: z.string().nullable().optional(),
});

export type EquipmentFormData = z.infer<typeof equipmentFormSchema>;

interface EquipmentFormModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  initialData?: Equipment | null;
  onSuccess?: () => void;
}

export function EquipmentFormModal({
  isOpen,
  onOpenChange,
  initialData,
  onSuccess,
}: EquipmentFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { notifyError, notifySuccess } = useNotification();

  const isEditMode = !!initialData;

  const form = useForm<EquipmentFormData>({
    resolver: zodResolver(equipmentFormSchema),
    defaultValues: {
      name: '',
      type: '',
      manufacturer: '',
      memo: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && initialData) {
        form.reset({
          name: initialData.name || '',
          type: initialData.type || '',
          manufacturer: initialData.manufacturer || '',
          memo: initialData.memo || '',
        });
      } else {
        form.reset({
          name: '',
          type: '',
          manufacturer: '',
          memo: '',
        });
      }
      setError(null);
      form.clearErrors();
    }
  }, [isOpen, isEditMode, initialData, form]);

  const onSubmit = async (data: EquipmentFormData) => {
    setIsSubmitting(true);
    setError(null);

    const equipmentData = {
      name: data.name,
      type: data.type,
      manufacturer: data.manufacturer || null,
      memo: data.memo || null,
    };

    const url = isEditMode && initialData ? `/api/master/equipment/${initialData.id}` : '/api/master/equipment';
    const method = isEditMode ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(equipmentData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      // 成功通知を表示
      notifySuccess(isEditMode ? 'update' : 'create', 'equipment');

      if (onSuccess) {
        onSuccess();
      }
      onOpenChange(false);
    } catch (err: unknown) {
      console.error('Failed to save equipment:', err);
      notifyError(err, { operation: isEditMode ? 'update' : 'create', entity: 'equipment' });
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
          <DialogTitle>{isEditMode ? 'Edit Equipment' : 'Add New Equipment'}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update the details of the equipment."
              : "Add a new piece of equipment to your inventory."}
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
                    <Input placeholder="Equipment name" {...field} />
                  </FormControl>
                  <FormMessage className="col-span-4 text-right" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-4">
                  <FormLabel className="text-right">Type</FormLabel>
                  <FormControl className="col-span-3">
                    <Input placeholder="e.g., Recorder, Microphone" {...field} />
                  </FormControl>
                  <FormMessage className="col-span-4 text-right" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="manufacturer"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-4">
                  <FormLabel className="text-right">Manufacturer</FormLabel>
                  <FormControl className="col-span-3">
                    <Input placeholder="e.g., Zoom, Sennheiser" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage className="col-span-4 text-right" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="memo"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-4">
                  <FormLabel className="text-right">Memo</FormLabel>
                  <FormControl className="col-span-3">
                    <Textarea placeholder="Any notes about the equipment" {...field} value={field.value || ''} rows={3} />
                  </FormControl>
                  <FormMessage className="col-span-4 text-right" />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !form.formState.isValid}>
                {isSubmitting ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Add Equipment')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 
