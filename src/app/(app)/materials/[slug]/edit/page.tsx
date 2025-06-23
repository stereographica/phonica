'use client';

import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useState, FormEvent, ChangeEvent, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, TagsIcon, Loader2 } from 'lucide-react';
import { EquipmentMultiSelect } from '@/components/materials/EquipmentMultiSelect';
import { StarRating } from '@/components/ui/star-rating';
import { useNotification } from '@/hooks/use-notification';
import { AudioMetadata } from '@/lib/audio-metadata';
import {
  getMaterial,
  uploadAndAnalyzeAudio,
  updateMaterialWithMetadata,
} from '@/lib/actions/materials';
import { ERROR_MESSAGES } from '@/lib/error-messages';
import LocationInputField from '@/components/materials/LocationInputField';

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
  durationSeconds: number | null;
  channels: number | null;
  latitude: number | null;
  longitude: number | null;
  locationName: string | null;
  rating: number | null;
}

type UploadProgress = 'idle' | 'uploading' | 'analyzing' | 'ready' | 'error';

export default function EditMaterialPage() {
  const router = useRouter();
  const params = useParams();
  const slugFromParams = typeof params.slug === 'string' ? params.slug : null;
  const { notifyError, notifySuccess } = useNotification();

  const [initialLoading, setInitialLoading] = useState(true);
  const [material, setMaterial] = useState<MaterialData | null>(null);

  const [title, setTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [existingFilePath, setExistingFilePath] = useState<string | null>(null);
  const [recordedAt, setRecordedAt] = useState('');
  const [memo, setMemo] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [latitude, setLatitude] = useState<number | string>('');
  const [longitude, setLongitude] = useState<number | string>('');
  const [locationName, setLocationName] = useState('');
  const [rating, setRating] = useState<number>(0);
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<string[]>([]);

  // 自動取得用の状態
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>('idle');
  const [tempFileId, setTempFileId] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<AudioMetadata | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [existingMetadata, setExistingMetadata] = useState<AudioMetadata | null>(null);

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
      const result = await getMaterial(currentSlug);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch material data');
      }
      const data = result.data as MaterialData;
      setMaterial(data);
      setTitle(data.title || '');
      setRecordedAt(formatDateForInput(data.recordedDate));
      setMemo(data.memo || '');
      setTagsInput(data.tags?.map((t) => t.name).join(', ') || '');
      setExistingFilePath(data.filePath || null);
      setLatitude(data.latitude?.toString() || '');
      setLongitude(data.longitude?.toString() || '');
      setLocationName(data.locationName || '');
      setRating(data.rating || 0);
      setSelectedEquipmentIds(data.equipments?.map((e) => e.id) || []);

      // 既存のメタデータを保存
      if (
        data.fileFormat ||
        data.sampleRate ||
        data.bitDepth ||
        data.durationSeconds ||
        data.channels
      ) {
        setExistingMetadata({
          fileFormat: data.fileFormat || 'UNKNOWN',
          sampleRate: data.sampleRate || 0,
          bitDepth: data.bitDepth,
          durationSeconds: data.durationSeconds || 0,
          channels: data.channels || 0,
        });
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An unknown error occurred while fetching data.',
      );
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    if (slugFromParams) {
      // 修正: slug -> slugFromParams
      fetchMaterial(slugFromParams); // 修正: slug -> slugFromParams
    } else {
      setError('Material slug is missing.');
      setInitialLoading(false);
    }
  }, [slugFromParams, fetchMaterial]); // 修正: slug -> slugFromParams

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setFileName(file.name);
      setUploadProgress('uploading');
      setError(null);

      try {
        // Server Actionを使用してファイルアップロードとメタデータ抽出
        const uploadFormData = new FormData();
        uploadFormData.append('file', file);

        setUploadProgress('analyzing');
        const result = await uploadAndAnalyzeAudio(uploadFormData);

        if (!result.success) {
          throw new Error(result.error || 'Failed to process file');
        }

        setTempFileId(result.tempFileId!);
        setMetadata(result.metadata!);
        setUploadProgress('ready');
      } catch (err) {
        console.error('File processing error:', err);
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

    try {
      // Server Action用のデータを準備
      const requestData = {
        title: title.trim(),
        recordedAt: recordedAtISO,
        memo: memo || null,
        tags: tagsInput
          ? tagsInput
              .split(',')
              .map((tag) => tag.trim())
              .filter((tag) => tag)
          : [],
        equipmentIds: selectedEquipmentIds,
        latitude: latitude ? parseFloat(String(latitude)) : null,
        longitude: longitude ? parseFloat(String(longitude)) : null,
        locationName: locationName || null,
        rating: rating > 0 ? rating : null,
        // 新しいファイルがアップロードされた場合
        ...(selectedFile && tempFileId && metadata
          ? {
              tempFileId,
              fileName,
              metadata,
            }
          : {}),
      };

      const result = await updateMaterialWithMetadata(slugFromParams, requestData);

      if (!result.success) {
        // エラーハンドリング
        if (result.error === ERROR_MESSAGES.MATERIAL_TITLE_EXISTS) {
          const errorWithStatus = {
            error: result.error,
            status: 409,
            message: result.error,
          };
          throw errorWithStatus;
        }
        throw new Error(result.error || 'Failed to update material');
      }

      // 成功時のみページ遷移と成功通知を行う
      setIsSubmitting(false);
      notifySuccess('update', 'material');
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

  if (!slugFromParams && !initialLoading) {
    // 修正: slug -> slugFromParams
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/materials" passHref>
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
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
        <h1 className="text-2xl font-semibold">
          Edit Material {material?.title ? `\"${material.title}\"` : ''}
        </h1>
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

      <form
        data-testid="edit-material-form"
        onSubmit={handleSubmit}
        className="space-y-8 md:max-w-3xl"
      >
        {/* UI Sections (File, Basic Info, Metadata, Location, Details, Memo, Actions) remain largely the same as NewMaterialPage, with value props bound to state derived from fetchedMaterial */}
        {/* File Input Section - Modified for existing file display */}
        <div className="space-y-4 p-6 border rounded-lg">
          <h2 className="text-xl font-semibold">Audio File</h2>
          <div className="space-y-2">
            <Label htmlFor="audioFile">Select New Audio File (Optional)</Label>
            <Input id="audioFile" type="file" accept="audio/*" onChange={handleFileChange} />
            {selectedFile && (
              <div className="space-y-2">
                <p data-testid="selected-file-info" className="text-xs text-muted-foreground">
                  New file selected: {selectedFile.name} (
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
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

        {/* Technical Metadata Section - 音声ファイルがある場合のみ表示 */}
        {(metadata || existingMetadata) && (
          <div className="space-y-4 p-6 border rounded-lg">
            <h2 className="text-xl font-semibold">Technical Metadata</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">File Format</Label>
                <p className="text-sm font-medium">
                  {(metadata || existingMetadata)?.fileFormat || 'N/A'}
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Sample Rate</Label>
                <p className="text-sm font-medium">
                  {((metadata || existingMetadata)?.sampleRate || 0).toLocaleString()} Hz
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Bit Depth</Label>
                <p className="text-sm font-medium">
                  {(metadata || existingMetadata)?.bitDepth
                    ? `${(metadata || existingMetadata)?.bitDepth} bit`
                    : 'N/A'}
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Duration</Label>
                <p className="text-sm font-medium">
                  {(metadata || existingMetadata)?.durationSeconds
                    ? `${Math.round((metadata || existingMetadata)!.durationSeconds)} seconds`
                    : 'N/A'}
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Channels</Label>
                <p className="text-sm font-medium">
                  {(metadata || existingMetadata)?.channels === 1
                    ? 'Mono'
                    : (metadata || existingMetadata)?.channels === 2
                      ? 'Stereo'
                      : `${(metadata || existingMetadata)?.channels || 0} channels`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Location Section */}
        <LocationInputField
          latitude={latitude}
          longitude={longitude}
          locationName={locationName}
          onLatitudeChange={setLatitude}
          onLongitudeChange={setLongitude}
          onLocationNameChange={setLocationName}
        />

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
            <Label htmlFor="rating">Rating</Label>
            <StarRating
              id="rating"
              value={rating}
              onChange={(value) => setRating(value)}
              size="lg"
            />
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
            <Button type="button" variant="outline" disabled={isSubmitting || initialLoading}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting || initialLoading}>
            {isSubmitting ? 'Updating...' : 'Update Material'}
          </Button>
        </div>
      </form>
    </div>
  );
}
