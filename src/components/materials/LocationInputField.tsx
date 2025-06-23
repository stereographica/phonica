'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Camera, Loader2 } from 'lucide-react';
import { config } from '@/lib/config';
import PhotoLocationExtractor from './PhotoLocationExtractor';
import LocationPicker from './LocationPicker';
import CurrentLocationButton from './CurrentLocationButton';
import dynamic from 'next/dynamic';

// Dynamic import for map preview to avoid SSR issues
const MaterialLocationMap = dynamic(() => import('@/components/maps/MaterialLocationMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] bg-muted animate-pulse rounded-md flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  ),
});

interface LocationInputFieldProps {
  latitude: number | string;
  longitude: number | string;
  locationName: string;
  onLatitudeChange: (value: number | string) => void;
  onLongitudeChange: (value: number | string) => void;
  onLocationNameChange: (value: string) => void;
}

export default function LocationInputField({
  latitude,
  longitude,
  locationName,
  onLatitudeChange,
  onLongitudeChange,
  onLocationNameChange,
}: LocationInputFieldProps) {
  const [showPhotoExtractor, setShowPhotoExtractor] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  // Check if coordinates are valid for map preview
  const hasValidCoordinates = () => {
    const lat = typeof latitude === 'string' ? parseFloat(latitude) : latitude;
    const lng = typeof longitude === 'string' ? parseFloat(longitude) : longitude;
    return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  };

  const handlePhotoLocationExtracted = (extractedLat: number, extractedLng: number) => {
    onLatitudeChange(extractedLat);
    onLongitudeChange(extractedLng);
    setShowPhotoExtractor(false);
  };

  const handleMapLocationSelected = (selectedLat: number, selectedLng: number) => {
    onLatitudeChange(selectedLat);
    onLongitudeChange(selectedLng);
    setShowLocationPicker(false);
  };

  const handleCurrentLocationReceived = (currentLat: number, currentLng: number) => {
    onLatitudeChange(currentLat);
    onLongitudeChange(currentLng);
    setIsLoadingLocation(false);
  };

  return (
    <div className="space-y-6 p-6 border rounded-lg">
      <h2 className="text-xl font-semibold">Location</h2>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowPhotoExtractor(true)}
          className="flex items-center gap-2"
        >
          <Camera className="h-4 w-4" />
          Extract from Photo
        </Button>

        {config.features.geolocation && (
          <CurrentLocationButton
            onLocationReceived={handleCurrentLocationReceived}
            onLoadingChange={setIsLoadingLocation}
            disabled={isLoadingLocation}
          />
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowLocationPicker(true)}
          className="flex items-center gap-2"
        >
          <MapPin className="h-4 w-4" />
          Select on Map
        </Button>
      </div>

      {/* Coordinate inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="latitude">Latitude</Label>
          <Input
            id="latitude"
            type="number"
            step="any"
            value={latitude}
            onChange={(e) => onLatitudeChange(e.target.value)}
            placeholder="e.g., 35.681236"
            disabled={isLoadingLocation}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="longitude">Longitude</Label>
          <Input
            id="longitude"
            type="number"
            step="any"
            value={longitude}
            onChange={(e) => onLongitudeChange(e.target.value)}
            placeholder="e.g., 139.767125"
            disabled={isLoadingLocation}
          />
        </div>
      </div>

      {/* Location name input */}
      <div className="space-y-2">
        <Label htmlFor="locationName">Location Name (Optional)</Label>
        <Input
          id="locationName"
          value={locationName}
          onChange={(e) => onLocationNameChange(e.target.value)}
          placeholder="e.g., Yoyogi Park"
          disabled={isLoadingLocation}
        />
      </div>

      {/* Map preview */}
      {hasValidCoordinates() && (
        <div className="mt-4">
          <Label className="text-sm text-muted-foreground mb-2 block">Location Preview</Label>
          <div
            className="rounded-md overflow-hidden border"
            style={{
              height: '300px',
              minHeight: '300px',
            }}
            data-testid="location-preview-container"
          >
            <MaterialLocationMap
              latitude={typeof latitude === 'string' ? parseFloat(latitude) : latitude}
              longitude={typeof longitude === 'string' ? parseFloat(longitude) : longitude}
              popupText={locationName || 'Recording Location'}
              zoom={14}
            />
          </div>
        </div>
      )}

      {/* Photo extractor modal */}
      {showPhotoExtractor && (
        <PhotoLocationExtractor
          isOpen={showPhotoExtractor}
          onClose={() => setShowPhotoExtractor(false)}
          onLocationExtracted={handlePhotoLocationExtracted}
        />
      )}

      {/* Location picker modal */}
      {showLocationPicker && (
        <LocationPicker
          isOpen={showLocationPicker}
          onClose={() => setShowLocationPicker(false)}
          onLocationSelected={handleMapLocationSelected}
          initialLatitude={
            hasValidCoordinates()
              ? typeof latitude === 'string'
                ? parseFloat(latitude)
                : latitude
              : 35.681236 // Default to Tokyo
          }
          initialLongitude={
            hasValidCoordinates()
              ? typeof longitude === 'string'
                ? parseFloat(longitude)
                : longitude
              : 139.767125 // Default to Tokyo
          }
        />
      )}
    </div>
  );
}
