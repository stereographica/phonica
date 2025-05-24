'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// 機材データの型 (Prismaのスキーマに合わせる想定)
interface Equipment {
  id?: string | undefined; // string | undefined に変更
  name: string;
  maker: string;
  model: string | null;
  serialNumber: string | null;
  notes: string | null;
}

interface EquipmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Equipment) => void;
  initialData?: Equipment | null;
}

export function EquipmentFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: EquipmentFormModalProps) {
  const [name, setName] = useState('');
  const [maker, setMaker] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [notes, setNotes] = useState('');

  const isEditing = !!initialData;

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setMaker(initialData.maker || '');
      setModel(initialData.model || '');
      setSerialNumber(initialData.serialNumber || '');
      setNotes(initialData.notes || '');
    } else {
      // 新規作成時はフォームをクリア
      setName('');
      setMaker('');
      setModel('');
      setSerialNumber('');
      setNotes('');
    }
  }, [initialData, isOpen]); // isOpen も依存配列に追加し、モーダルが開くたびに初期化

  const handleSubmit = () => {
    const equipmentData: Equipment = {
      name,
      maker,
      model: model || null,
      serialNumber: serialNumber || null,
      notes: notes || null,
    };
    if (isEditing && initialData?.id) {
      equipmentData.id = initialData.id;
    }
    onSubmit(equipmentData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Equipment' : 'Add New Equipment'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the details of the equipment.'
              : 'Enter the details for the new equipment.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              placeholder="e.g., Microphone XYZ"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="maker" className="text-right">
              Maker
            </Label>
            <Input
              id="maker"
              value={maker}
              onChange={(e) => setMaker(e.target.value)}
              className="col-span-3"
              placeholder="e.g., Audio-Technica"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="model" className="text-right">
              Model
            </Label>
            <Input
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="col-span-3"
              placeholder="e.g., AT2020"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="serialNumber" className="text-right">
              Serial No.
            </Label>
            <Input
              id="serialNumber"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="notes" className="text-right">
              Notes
            </Label>
            <Input // TODO: Textarea に変更するかも
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="col-span-3"
              placeholder="Any additional notes"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSubmit}>
            {isEditing ? 'Save Changes' : 'Create Equipment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 
