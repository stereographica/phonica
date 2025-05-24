'use client';

import { useState } from 'react';
// import Link from 'next/link'; // Link を削除
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, Edit, Trash2 } from 'lucide-react';
import { EquipmentFormModal } from '@/components/master/EquipmentFormModal';

// 機材データの型 (EquipmentFormModal と合わせる)
interface Equipment {
  id?: string;
  name: string;
  maker: string;
  model: string | null;
  serialNumber: string | null;
  notes: string | null;
}

// ダミーデータ
const dummyEquipment: Equipment[] = [
  {
    id: 'eq1',
    name: 'Sennheiser MKH 416',
    maker: 'Sennheiser',
    model: 'MKH 416-P48U3',
    serialNumber: 'SN12345',
    notes: 'Main shotgun mic, very reliable.',
  },
  {
    id: 'eq2',
    name: 'Sound Devices MixPre-6 II',
    maker: 'Sound Devices',
    model: 'MixPre-6 II',
    serialNumber: 'SDMP6II-9876',
    notes: 'Primary field recorder.',
  },
  {
    id: 'eq3',
    name: 'Rode NTG5',
    maker: 'Rode',
    model: 'NTG5',
    serialNumber: null,
    notes: 'Lighter shotgun mic, good for run-and-gun.',
  },
  {
    id: 'eq4',
    name: 'Zoom H5',
    maker: 'Zoom',
    model: 'H5',
    serialNumber: 'ZH5-ABCDE',
    notes: 'Backup recorder, also for quick stereo recordings.',
  },
];

export default function EquipmentPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);

  const openModal = (equipment: Equipment | null = null) => {
    setEditingEquipment(equipment);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEquipment(null);
  };

  const handleFormSubmit = (data: Equipment) => {
    if (editingEquipment && editingEquipment.id) {
      console.log('Updating equipment:', data);
      const index = dummyEquipment.findIndex(eq => eq.id === data.id);
      if (index !== -1) dummyEquipment[index] = { ...dummyEquipment[index], ...data, id: editingEquipment.id };
    } else {
      const newId = `eq${Date.now()}`;
      console.log('Creating new equipment:', { ...data, id: newId });
      dummyEquipment.push({ ...data, id: newId });
    }
    closeModal();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Equipment Management</h2>
        <Button onClick={() => openModal()}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Equipment
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Maker</TableHead>
              <TableHead className="hidden sm:table-cell">Model</TableHead>
              <TableHead className="hidden md:table-cell">Serial No.</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dummyEquipment.map((equipment) => (
              <TableRow key={equipment.id}>
                <TableCell className="font-medium">{equipment.name}</TableCell>
                <TableCell>{equipment.maker}</TableCell>
                <TableCell className="hidden sm:table-cell">{equipment.model || '-'}</TableCell>
                <TableCell className="hidden md:table-cell">{equipment.serialNumber || '-'}</TableCell>
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
                      <DropdownMenuItem onClick={() => openModal(equipment)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <EquipmentFormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={handleFormSubmit}
        initialData={editingEquipment}
      />
    </div>
  );
} 
