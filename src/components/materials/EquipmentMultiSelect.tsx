'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Equipment {
  id: string;
  name: string;
  type?: string;
  manufacturer?: string;
}

interface EquipmentMultiSelectProps {
  selectedEquipmentIds?: string[];
  onChange?: (selectedIds: string[]) => void;
  className?: string;
}

export function EquipmentMultiSelect({ 
  selectedEquipmentIds = [],
  onChange,
  className
}: EquipmentMultiSelectProps) {
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 機材リストを取得
  useEffect(() => {
    const fetchEquipment = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/master/equipment');
        if (!response.ok) {
          throw new Error('Failed to fetch equipment');
        }
        const data = await response.json();
        setEquipmentList(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchEquipment();
  }, []);

  const handleToggle = (equipmentId: string) => {
    const newSelectedIds = selectedEquipmentIds.includes(equipmentId)
      ? selectedEquipmentIds.filter(id => id !== equipmentId)
      : [...selectedEquipmentIds, equipmentId];
    
    onChange?.(newSelectedIds);
  };

  const removeEquipment = (equipmentId: string) => {
    const newSelectedIds = selectedEquipmentIds.filter(id => id !== equipmentId);
    onChange?.(newSelectedIds);
  };

  const selectedEquipment = equipmentList.filter(eq => selectedEquipmentIds.includes(eq.id));

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground">Loading equipment...</div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-destructive">Error loading equipment: {error}</div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* 選択済み機材の表示 */}
      {selectedEquipment.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedEquipment.map((eq) => (
            <div
              key={eq.id}
              className="flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-sm"
            >
              <span>{eq.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => removeEquipment(eq.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* 機材リスト */}
      <div className="max-h-60 overflow-y-auto rounded-md border p-4">
        {equipmentList.length === 0 ? (
          <div className="text-sm text-muted-foreground">No equipment available</div>
        ) : (
          <div className="space-y-2">
            {equipmentList.map((equipment) => (
              <div key={equipment.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`equipment-${equipment.id}`}
                  checked={selectedEquipmentIds.includes(equipment.id)}
                  onCheckedChange={() => handleToggle(equipment.id)}
                />
                <Label
                  htmlFor={`equipment-${equipment.id}`}
                  className="flex-1 cursor-pointer text-sm font-normal"
                >
                  <span className="font-medium">{equipment.name}</span>
                  {equipment.type && (
                    <span className="ml-2 text-muted-foreground">({equipment.type})</span>
                  )}
                  {equipment.manufacturer && (
                    <span className="ml-2 text-xs text-muted-foreground">- {equipment.manufacturer}</span>
                  )}
                </Label>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}