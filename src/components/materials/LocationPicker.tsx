'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import dynamic from 'next/dynamic';
import { MapPin, Loader2 } from 'lucide-react';

// Dynamic import for map to avoid SSR issues
const InteractiveMap = dynamic(() => import('./InteractiveMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] bg-muted animate-pulse rounded-md flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  ),
});

interface LocationPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSelected: (latitude: number, longitude: number) => void;
  initialLatitude?: number;
  initialLongitude?: number;
}

export default function LocationPicker({
  isOpen,
  onClose,
  onLocationSelected,
  initialLatitude = 35.681236, // Default to Tokyo
  initialLongitude = 139.767125,
}: LocationPickerProps) {
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(
    null,
  );

  const handleLocationSelect = (lat: number, lng: number) => {
    setSelectedLocation({ lat, lng });
  };

  const handleConfirm = () => {
    if (selectedLocation) {
      onLocationSelected(selectedLocation.lat, selectedLocation.lng);
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedLocation(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Select Location on Map
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Click on the map to select a location, or drag the marker to adjust the position.
          </div>

          {/* Interactive Map */}
          <div className="rounded-md overflow-hidden border">
            <InteractiveMap
              initialLatitude={initialLatitude}
              initialLongitude={initialLongitude}
              onLocationSelect={handleLocationSelect}
            />
          </div>

          {/* Selected coordinates display */}
          {selectedLocation && (
            <div className="flex gap-4 p-3 bg-muted rounded-md">
              <div>
                <Label className="text-xs text-muted-foreground">Latitude</Label>
                <p className="text-sm font-medium">{selectedLocation.lat.toFixed(6)}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Longitude</Label>
                <p className="text-sm font-medium">{selectedLocation.lng.toFixed(6)}</p>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={!selectedLocation}>
              Use This Location
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
