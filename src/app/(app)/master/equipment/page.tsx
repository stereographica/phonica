'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, Edit, Trash2 } from 'lucide-react';
import { EquipmentFormModal } from '@/components/master/EquipmentFormModal';
import { useNotification } from '@/hooks/use-notification';
import type { Equipment } from '@prisma/client';

export default function EquipmentPage() {
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const { notifyError, notifySuccess } = useNotification();

  const fetchEquipments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/master/equipment');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setEquipments(data);
    } catch (e: unknown) {
      console.error("Failed to fetch equipments:", e);
      if (e instanceof Error) {
        setError(e.message || "Failed to load equipments.");
      } else {
        setError("An unknown error occurred while fetching equipments.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipments();
  }, []);

  const handleAddEquipment = () => {
    setSelectedEquipment(null); // 新規作成モード
    setIsModalOpen(true);
  };

  const handleEditEquipment = (equipment: Equipment) => {
    setSelectedEquipment(equipment);
    setIsModalOpen(true);
  };

  const handleDeleteEquipment = async (equipmentId: string) => {
    if (!confirm('Are you sure you want to delete this equipment?')) {
      return;
    }
    try {
      const response = await fetch(`/api/master/equipment/${equipmentId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      // 成功したら一覧を再読み込み
      fetchEquipments();
      notifySuccess('delete', 'equipment');
    } catch (e: unknown) {
      console.error("Failed to delete equipment:", e);
      notifyError(e, { operation: 'delete', entity: 'equipment' });
    }
  };

  const handleModalSuccess = () => {
    fetchEquipments(); // モーダルでの保存成功時に一覧を再読み込み
  };

  if (isLoading) {
    return <p>Loading equipments...</p>;
  }

  if (error) {
    return <p className="text-destructive">Error: {error}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Equipment Master</h1>
        <Button onClick={handleAddEquipment}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Equipment
        </Button>
      </div>

      {equipments.length === 0 ? (
        <p>No equipment found. Add some!</p>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Manufacturer</TableHead>
                <TableHead>Memo</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipments.map((eq) => (
                <TableRow key={eq.id}>
                  <TableCell className="font-medium">{eq.name}</TableCell>
                  <TableCell>{eq.type}</TableCell>
                  <TableCell>{eq.manufacturer}</TableCell>
                  <TableCell className="max-w-xs truncate">{eq.memo}</TableCell>
                  <TableCell>{new Date(eq.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditEquipment(eq)}>
                          <Edit className="mr-2 h-4 w-4" />
                          <span>Edit</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteEquipment(eq.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Delete</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <EquipmentFormModal 
        isOpen={isModalOpen} 
        onOpenChange={setIsModalOpen} 
        initialData={selectedEquipment}
        onSuccess={handleModalSuccess} 
      />
    </div>
  );
} 
