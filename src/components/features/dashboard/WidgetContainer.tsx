'use client';

import React from 'react';
import { X, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface WidgetContainerProps {
  id: string;
  title: string;
  children: React.ReactNode;
  onRemove?: (id: string) => void;
  className?: string;
  isDragging?: boolean;
}

export function WidgetContainer({
  id,
  title,
  children,
  onRemove,
  className,
  isDragging = false,
}: WidgetContainerProps) {
  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onRemove) {
      onRemove(id);
    }
  };

  return (
    <Card
      className={cn(
        'h-full w-full overflow-hidden transition-all',
        isDragging && 'opacity-70 scale-95',
        className,
      )}
    >
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GripVertical
              className="h-5 w-5 text-muted-foreground cursor-move drag-handle"
              aria-label="ドラッグハンドル"
            />
            <CardTitle className="text-base font-medium">{title}</CardTitle>
          </div>
          {onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleRemove}
              aria-label={`${title}を削除`}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 h-[calc(100%-3.5rem)] overflow-auto">{children}</CardContent>
    </Card>
  );
}
