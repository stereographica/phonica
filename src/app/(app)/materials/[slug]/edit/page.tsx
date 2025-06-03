'use client';

import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation'; // useParams を追加
import { useState, FormEvent, ChangeEvent, useEffect, useCallback } from 'react'; // useEffect, useCallback を追加
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, TagsIcon, Loader2 } from 'lucide-react'; // Loader2 を追加
import { EquipmentMultiSelect } from '@/components/materials/EquipmentMultiSelect';
import { useNotification } from '@/hooks/use-notification';

// APIから返される素材データの型 (GET /api/materials/[slug] のレスポンスに合わせる)
interface MaterialData {
  id: string;
  slug: string;
  title: string;
  recordedDate: string; // ISO String
  memo: string | null;
  tags: { name: string }[]; // name の配列
  equipments?: { id: string; name: string }[]; // 機材の配列
  filePath: string;
  fileFormat: string | null;
  sampleRate: number | null;
  bitDepth: number | null;
  latitude: number | null;
  longitude: number | null;
  locationName: string | null;
  rating: number | null;
  // 必要に応じて他のフィールドも追加
}

export default function EditMaterialPage() {
  const router = useRouter();
  const params = useParams();
  const slugFromParams = typeof params.slug === 'string' ? params.slug : null; // 修正: params.id -> params.slug
  const { notifyError, notifySuccess } = useNotification();

  const [initialLoading, setInitialLoading] = useState(true);
  const [material, setMaterial] = useState<MaterialData | null>(null);

  const [title, setTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [existingFilePath, setExistingFilePath] = useState<string | null>(null);
  const [recordedAt, setRecordedAt] = useState('');
  const [memo, setMemo] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [fileFormat, setFileFormat] = useState('');
  const [sampleRate, setSampleRate] = useState<number | string>('');
  const [bitDepth, setBitDepth] = useState<number | string>('');
  const [latitude, setLatitude] = useState<number | string>('');
  const [longitude, setLongitude] = useState<number | string>('');
  const [locationName, setLocationName] = useState('');
  const [rating, setRating] = useState<number | string>('');
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatDateForInput = (isoDate: string | null | undefined): string => {
    if (!isoDate) return '';
    try {
      const date = new Date(isoDate);
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch (e) {
      console.warn('Error formatting date for input:', e);
      return '';
    }
  };
  
  const fetchMaterial = useCallback(async (currentSlug: string) => {
    setInitialLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/materials/${currentSlug}`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to fetch material data');
      }
      const data: MaterialData = await response.json();
      setMaterial(data);
      setTitle(data.title || '');
      setRecordedAt(formatDateForInput(data.recordedDate));
      setMemo(data.memo || '');
      setTagsInput(data.tags?.map(t => t.name).join(', ') || '');
      setExistingFilePath(data.filePath || null);
      setFileFormat(data.fileFormat || '');
      setSampleRate(data.sampleRate?.toString() || '');
      setBitDepth(data.bitDepth?.toString() || '');
      setLatitude(data.latitude?.toString() || '');
      setLongitude(data.longitude?.toString() || '');
      setLocationName(data.locationName || '');
      setRating(data.rating?.toString() || '');
      setSelectedEquipmentIds(data.equipments?.map(e => e.id) || []);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred while fetching data.');
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    if (slugFromParams) { // 修正: slug -> slugFromParams
      fetchMaterial(slugFromParams); // 修正: slug -> slugFromParams
    } else {
      setError('Material slug is missing.');
      setInitialLoading(false);
    }
  }, [slugFromParams, fetchMaterial]); // 修正: slug -> slugFromParams

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    } else {
      setSelectedFile(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!slugFromParams) { 
      setError('Cannot submit: Material slug is missing.');
      return;
    }
    setIsSubmitting(true);
    setError(null);

    if (!title.trim()) {
      setError('Title is required.');
      setIsSubmitting(false);
      return;
    }
    if (!recordedAt) {
      setError('Recorded At is required.');
      setIsSubmitting(false);
      return;
    }
    
    let recordedAtISO = '';
    try {
      recordedAtISO = new Date(recordedAt).toISOString();
    } catch (e) {
      console.warn(`Date parsing error: ${(e as Error).message}`);
      setError('Invalid date format for Recorded At. Please use YYYY-MM-DDTHH:MM format.');
      setIsSubmitting(false);
      return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('recordedAt', recordedAtISO);
    if (memo) formData.append('memo', memo); else formData.append('memo', '');
    if (tagsInput) formData.append('tags', tagsInput); else formData.append('tags', '');
    if (fileFormat) formData.append('fileFormat', fileFormat); else formData.append('fileFormat', '');
    if (sampleRate) formData.append('sampleRate', String(sampleRate));
    if (bitDepth) formData.append('bitDepth', String(bitDepth));
    if (latitude) formData.append('latitude', String(latitude));
    if (longitude) formData.append('longitude', String(longitude));
    if (locationName) formData.append('locationName', locationName); else formData.append('locationName', '');
    if (rating) formData.append('rating', String(rating));
    if (selectedEquipmentIds.length > 0) formData.append('equipmentIds', selectedEquipmentIds.join(','));

    if (selectedFile) {
      formData.append('file', selectedFile);
    }

    try {
      const response = await fetch(`/api/materials/${slugFromParams}`, {
        method: 'PUT',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      notifySuccess('update', 'material');
      setIsSubmitting(false);
      router.push('/materials');

    } catch (err) {
      console.error('Failed to update material:', err);
      notifyError(err, { operation: 'update', entity: 'material' });
      setIsSubmitting(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading material data...</p>
      </div>
    );
  }
  
  if (!slugFromParams && !initialLoading) { // 修正: slug -> slugFromParams
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/materials" passHref>
                    <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
                </Link>
                <h1 className="text-2xl font-semibold">Edit Material</h1>
            </div>
            <p className="text-destructive">Error: Material identifier is missing. Cannot load data.</p>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/materials" passHref>
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold">Edit Material {material?.title ? `\"${material.title}\"` : ''}</h1>
      </div>

      {error && (
        <p 
          role="alert" 
          data-testid="error-message" 
          className="text-sm font-medium text-destructive"
        >
          {error}
        </p>
      )}

      <form data-testid="edit-material-form" onSubmit={handleSubmit} className="space-y-8 md:max-w-3xl">
        {/* UI Sections (File, Basic Info, Metadata, Location, Details, Memo, Actions) remain largely the same as NewMaterialPage, with value props bound to state derived from fetchedMaterial */}
        {/* File Input Section - Modified for existing file display */}
        <div className="space-y-4 p-6 border rounded-lg">
          <h2 className="text-xl font-semibold">Audio File</h2>
           <div className="space-y-2">
            <Label htmlFor="audioFile">Select New Audio File (Optional)</Label>
            <Input 
              id="audioFile" 
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
            />
            {selectedFile && (
              <p data-testid="selected-file-info" className="text-xs text-muted-foreground">
                New file selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
            {!selectedFile && existingFilePath && (
                <p className="text-xs text-muted-foreground">
                    Current file: {existingFilePath.split('/').pop() || existingFilePath}
                </p>
            )}
            {!selectedFile && !existingFilePath && (
                <p className="text-xs text-destructive">
                    No audio file currently associated. Please select one if needed.
                </p>
            )}
          </div>
        </div>

        {/* Basic Information Section */}
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

        {/* Technical Metadata Section */}
        <div className="space-y-4 p-6 border rounded-lg">
          <h2 className="text-xl font-semibold">Technical Metadata</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fileFormat">File Format</Label>
              <Input id="fileFormat" value={fileFormat} onChange={(e) => setFileFormat(e.target.value)} placeholder="e.g., WAV" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sampleRate">Sample Rate (Hz)</Label>
              <Input id="sampleRate" type="number" value={sampleRate} onChange={(e) => setSampleRate(e.target.value)} placeholder="e.g., 48000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bitDepth">Bit Depth</Label>
              <Input id="bitDepth" type="number" value={bitDepth} onChange={(e) => setBitDepth(e.target.value)} placeholder="e.g., 24" />
            </div>
          </div>
        </div>
        
        {/* Location Section */}
        <div className="space-y-6 p-6 border rounded-lg">
          <h2 className="text-xl font-semibold">Location (Manual Input)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="latitude">Latitude</Label>
              <Input id="latitude" type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="e.g., 35.681236" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="longitude">Longitude</Label>
              <Input id="longitude" type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="e.g., 139.767125" />
            </div>
          </div>
          <div className="space-y-2 mt-4">
            <Label htmlFor="locationName">Location Name (Optional)</Label>
            <Input id="locationName" value={locationName} onChange={(e) => setLocationName(e.target.value)} placeholder="e.g., Yoyogi Park" />
          </div>
        </div>

        {/* Equipment Section */}
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

        {/* Details Section (Tags & Rating) */}
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
            <Input id="rating" type="number" min="1" max="5" value={rating} onChange={(e) => setRating(e.target.value)} placeholder="e.g., 4" />
          </div>
        </div>

        {/* Memo Section */}
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
            <Button type="button" variant="outline" disabled={isSubmitting || initialLoading}>Cancel</Button>
          </Link>
          <Button type="submit" disabled={isSubmitting || initialLoading}>
            {isSubmitting ? 'Updating...' : 'Update Material'}
          </Button>
        </div>
      </form>
    </div>
  );
} 
