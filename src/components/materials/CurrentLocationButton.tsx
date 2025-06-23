'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Navigation, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface CurrentLocationButtonProps {
  onLocationReceived: (latitude: number, longitude: number) => void;
  onLoadingChange?: (isLoading: boolean) => void;
  disabled?: boolean;
}

export default function CurrentLocationButton({
  onLocationReceived,
  onLoadingChange,
  disabled = false,
}: CurrentLocationButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGetCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLoading(true);
    setError(null);
    onLoadingChange?.(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Success callback
        const { latitude, longitude } = position.coords;
        onLocationReceived(latitude, longitude);
        setIsLoading(false);
        onLoadingChange?.(false);
      },
      (error) => {
        // Error callback
        setIsLoading(false);
        onLoadingChange?.(false);

        switch (error.code) {
          case error.PERMISSION_DENIED:
            setError(
              'Location permission was denied. Please enable location services and try again.',
            );
            break;
          case error.POSITION_UNAVAILABLE:
            setError('Location information is unavailable. Please try again later.');
            break;
          case error.TIMEOUT:
            setError('Location request timed out. Please try again.');
            break;
          default:
            setError('An unknown error occurred while getting your location.');
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000, // 10 seconds
        maximumAge: 0,
      },
    );
  };

  return (
    <div className="inline-flex flex-col gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleGetCurrentLocation}
        disabled={disabled || isLoading}
        className="flex items-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Getting Location...
          </>
        ) : (
          <>
            <Navigation className="h-4 w-4" />
            Use Current Location
          </>
        )}
      </Button>

      {error && (
        <Alert variant="destructive" className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
