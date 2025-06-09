'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, FormEvent, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
// import { Checkbox } from '@/components/ui/checkbox'; // Not used yet
import { ArrowLeft, TagsIcon, Loader2 } from 'lucide-react'; // Added Loader2 for progress
import { EquipmentMultiSelect } from '@/components/materials/EquipmentMultiSelect';
import { useNotification } from '@/hooks/use-notification';

// Audio metadata type
interface AudioMetadata {
  fileFormat: string;
  sampleRate: number;
  bitDepth: number | null;
  durationSeconds: number;
  channels: number;
}

export default function NewMaterialPage() {
  const router = useRouter();
  const { notifyError, notifySuccess } = useNotification();
  const [title, setTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [recordedAt, setRecordedAt] = useState('');
  const [memo, setMemo] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [latitude, setLatitude] = useState<number | string>('');
  const [longitude, setLongitude] = useState<number | string>('');
  const [locationName, setLocationName] = useState('');
  const [rating, setRating] = useState<number | string>('');
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<string[]>([]);

  // New states for metadata extraction
  const [tempFileId, setTempFileId] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<AudioMetadata | null>(null);
  const [uploadProgress, setUploadProgress] = useState<
    'idle' | 'uploading' | 'analyzing' | 'ready' | 'error'
  >('idle');
  const [fileName, setFileName] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setSelectedFile(file);
      setFileName(file.name);
      setError(null);

      // Start async upload and metadata extraction
      try {
        // Step 1: Upload temporary file
        setUploadProgress('uploading');
        const formData = new FormData();
        formData.append('file', file);

        const uploadResponse = await fetch('/api/materials/upload-temp', {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.error || 'Failed to upload file');
        }

        const uploadData = await uploadResponse.json();
        setTempFileId(uploadData.tempFileId);

        // Step 2: Analyze audio metadata
        setUploadProgress('analyzing');
        const analyzeResponse = await fetch('/api/materials/analyze-audio', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ tempFileId: uploadData.tempFileId }),
        });

        if (!analyzeResponse.ok) {
          const errorData = await analyzeResponse.json();
          throw new Error(errorData.error || 'Failed to analyze audio');
        }

        const metadataData = await analyzeResponse.json();
        setMetadata(metadataData);
        setUploadProgress('ready');
      } catch (err) {
        console.error('File processing error:', err);
        setError(err instanceof Error ? err.message : 'Failed to process file');
        setUploadProgress('error');
        setTempFileId(null);
        setMetadata(null);
      }
    } else {
      setSelectedFile(null);
      setTempFileId(null);
      setMetadata(null);
      setUploadProgress('idle');
      setFileName('');
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!selectedFile || !tempFileId || !metadata) {
      setError('Please select an audio file and wait for processing to complete.');
      return;
    }
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    if (!recordedAt) {
      setError('Recorded At is required.');
      return;
    }

    let recordedAtISO;
    try {
      const dateObj = new Date(recordedAt);
      if (isNaN(dateObj.getTime())) {
        throw new Error('Invalid date string');
      }
      recordedAtISO = dateObj.toISOString();
    } catch (e) {
      console.warn(`Date parsing error: ${(e as Error).message}`);
      setError('Invalid date format for Recorded At. Please use YYYY-MM-DDTHH:MM format.');
      return;
    }

    setIsSubmitting(true);

    // Prepare JSON data for new API
    const requestData = {
      title: title.trim(),
      tempFileId,
      fileName,
      recordedAt: recordedAtISO,
      memo: memo || null,
      tags: tagsInput
        ? tagsInput
            .split(',')
            .map((tag) => tag.trim())
            .filter((tag) => tag)
        : [],
      equipmentIds: selectedEquipmentIds,
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null,
      locationName: locationName || null,
      rating: rating ? Number(rating) : null,
      metadata, // Include extracted metadata
    };

    try {
      // Use new JSON API
      const response = await fetch('/api/materials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        // エラーオブジェクトにstatusを含める
        const errorWithStatus = {
          ...errorData,
          status: response.status,
          message: errorData.error || `HTTP error! status: ${response.status}`,
        };
        throw errorWithStatus;
      }

      // JSONレスポンスは不要
      await response.json();

      // 成功通知を表示
      notifySuccess('create', 'material');

      // 成功後、リダイレクト前に状態をリセット
      setIsSubmitting(false);

      // すぐにリダイレクト
      await router.push('/materials');
    } catch (err: unknown) {
      console.error('Failed to save material:', err);
      notifyError(err, { operation: 'create', entity: 'material' });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/materials" passHref>
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold">New Material</h1>
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      <form
        data-testid="new-material-form"
        onSubmit={handleSubmit}
        className="space-y-8 md:max-w-3xl"
      >
        {/* Section 1: File Input */}
        <div className="space-y-4 p-6 border rounded-lg">
          <h2 className="text-xl font-semibold">Audio File</h2>
          <div className="space-y-2">
            <Label htmlFor="audioFile">Select Audio File</Label>
            <Input
              id="audioFile"
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              required
              disabled={uploadProgress === 'uploading' || uploadProgress === 'analyzing'}
            />
            {selectedFile && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Selected file: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)}{' '}
                  MB)
                </p>
                {/* Upload progress indicator */}
                {uploadProgress === 'uploading' && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Uploading file...</span>
                  </div>
                )}
                {uploadProgress === 'analyzing' && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Analyzing audio metadata...</span>
                  </div>
                )}
                {uploadProgress === 'ready' && metadata && (
                  <div className="text-sm text-green-600">
                    ✓ File uploaded and analyzed successfully
                  </div>
                )}
                {uploadProgress === 'error' && (
                  <div className="text-sm text-red-600">
                    ✗ Failed to process file. Please try again.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Basic Information */}
        <div className="space-y-4 p-6 border rounded-lg">
          <h2 className="text-xl font-semibold">Basic Information</h2>
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Morning Chorus at Yoyogi Park"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="recordedAt">Recorded At</Label>
            <Input
              id="recordedAt"
              type="datetime-local"
              value={recordedAt}
              onChange={(e) => setRecordedAt(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Section 3: Technical Metadata (Auto-extracted) */}
        {metadata && (
          <div className="space-y-4 p-6 border rounded-lg bg-muted/50">
            <h2 className="text-xl font-semibold">Technical Metadata (Auto-extracted)</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">File Format</Label>
                <p className="text-sm font-medium">{metadata.fileFormat}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Sample Rate</Label>
                <p className="text-sm font-medium">{metadata.sampleRate.toLocaleString()} Hz</p>
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Bit Depth</Label>
                <p className="text-sm font-medium">{metadata.bitDepth || 'N/A'} bit</p>
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Duration</Label>
                <p className="text-sm font-medium">
                  {Math.floor(metadata.durationSeconds / 60)}:
                  {String(Math.floor(metadata.durationSeconds % 60)).padStart(2, '0')}
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Channels</Label>
                <p className="text-sm font-medium">
                  {metadata.channels === 1
                    ? 'Mono'
                    : metadata.channels === 2
                      ? 'Stereo'
                      : `${metadata.channels} channels`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Section 5: Location */}
        <div className="space-y-6 p-6 border rounded-lg">
          <h2 className="text-xl font-semibold">Location (Manual Input)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="latitude">Latitude</Label>
              <Input
                id="latitude"
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="e.g., 35.681236"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="longitude">Longitude</Label>
              <Input
                id="longitude"
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="e.g., 139.767125"
              />
            </div>
          </div>
          <div className="space-y-2 mt-4">
            <Label htmlFor="locationName">Location Name (Optional)</Label>
            <Input
              id="locationName"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="e.g., Yoyogi Park"
            />
          </div>
        </div>

        {/* Section 6: Equipment */}
        <div className="space-y-4 p-6 border rounded-lg">
          <h2 className="text-xl font-semibold">Equipment</h2>
          <div className="space-y-2">
            <Label htmlFor="equipment">Used Equipment</Label>
            <EquipmentMultiSelect
              selectedEquipmentIds={selectedEquipmentIds}
              onChange={setSelectedEquipmentIds}
            />
          </div>
        </div>

        {/* Section 7: Tags & Rating */}
        <div className="space-y-4 p-6 border rounded-lg">
          <h2 className="text-xl font-semibold">Details</h2>
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma separated)</Label>
            <div className="flex items-center border rounded-md px-3">
              <TagsIcon className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <Input
                id="tags"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="e.g., Nature, Birds, Park"
                className="flex h-10 w-full rounded-md border-input bg-transparent py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 border-0 focus-visible:ring-offset-0 focus-visible:ring-0"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rating">Rating (1-5)</Label>
            <Input
              id="rating"
              type="number"
              min="1"
              max="5"
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              placeholder="e.g., 4"
            />
          </div>
        </div>

        {/* Section 8: Memo */}
        <div className="space-y-4 p-6 border rounded-lg">
          <h2 className="text-xl font-semibold">Memo</h2>
          <div className="space-y-2">
            <Label htmlFor="memo">Memo</Label>
            <Textarea
              id="memo"
              data-testid="memo-textarea"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="Any notes about the recording situation, thoughts, etc."
              rows={5}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4">
          <Link href="/materials" passHref>
            <Button type="button" variant="outline" disabled={isSubmitting}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting || uploadProgress !== 'ready' || !metadata}>
            {isSubmitting ? 'Saving...' : 'Save Material'}
          </Button>
        </div>
      </form>
    </div>
  );
}
