'use client';

import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, X, CheckCircle, AlertCircle, Camera } from 'lucide-react';
import Image from 'next/image';
import exifr from 'exifr';

interface PhotoLocationExtractorProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationExtracted: (latitude: number, longitude: number) => void;
}

export default function PhotoLocationExtractor({
  isOpen,
  onClose,
  onLocationExtracted,
}: PhotoLocationExtractorProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [extractedLocation, setExtractedLocation] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const resetState = () => {
    setFile(null);
    setPreview(null);
    setExtractedLocation(null);
    setError(null);
    setIsProcessing(false);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFile = async (selectedFile: File) => {
    if (!selectedFile.type.startsWith('image/')) {
      setError('Please select an image file (JPEG, PNG, etc.)');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setIsProcessing(true);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(selectedFile);

    try {
      // Extract GPS data from EXIF
      const gps = await exifr.gps(selectedFile);

      if (gps && gps.latitude !== undefined && gps.longitude !== undefined) {
        setExtractedLocation({ lat: gps.latitude, lng: gps.longitude });
      } else {
        setError('No GPS information found in this image. Please try another photo.');
      }
    } catch (err) {
      console.error('Error extracting EXIF data:', err);
      setError('Failed to read image metadata. Please try another photo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const handleUseLocation = () => {
    if (extractedLocation) {
      onLocationExtracted(extractedLocation.lat, extractedLocation.lng);
      resetState();
    }
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Extract Location from Photo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* File upload area */}
          <div
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
              ${file ? 'border-solid border-muted' : ''}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {!file ? (
              <>
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">
                  Drag and drop a photo here, or click to select
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  Supports JPEG, PNG with GPS metadata
                </p>
                <Label htmlFor="photo-upload" className="cursor-pointer">
                  <Button variant="outline" asChild>
                    <span>Choose Photo</span>
                  </Button>
                </Label>
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  aria-label="Upload photo with GPS data"
                />
              </>
            ) : (
              <div className="space-y-4">
                {/* Preview */}
                {preview && (
                  <div className="relative">
                    <Image
                      src={preview}
                      alt="Uploaded photo"
                      width={300}
                      height={200}
                      className="max-h-48 mx-auto rounded-md object-contain"
                      unoptimized // For data URLs
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 bg-background/80 hover:bg-background"
                      onClick={resetState}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                <p className="text-sm font-medium">{file.name}</p>

                {/* Processing indicator */}
                {isProcessing && (
                  <p className="text-sm text-muted-foreground">Extracting GPS information...</p>
                )}

                {/* Extracted location */}
                {extractedLocation && !isProcessing && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Location found: {extractedLocation.lat.toFixed(6)},{' '}
                      {extractedLocation.lng.toFixed(6)}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>

          {/* Error message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleUseLocation} disabled={!extractedLocation || isProcessing}>
              Use This Location
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
