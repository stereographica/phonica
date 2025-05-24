'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
// import { Checkbox } from '@/components/ui/checkbox'; // Not used yet
import { ArrowLeft, TagsIcon } from 'lucide-react'; // Removed unused icons

export default function NewMaterialPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [filePath, setFilePath] = useState('');
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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (recordedAt && isNaN(new Date(recordedAt).getTime())) {
      setError('Invalid date format for Recorded At.');
      setIsSubmitting(false);
      return;
    }

    const tagsArray = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
    
    let recordedAtISO: string | undefined = undefined;
    try {
      if (recordedAt) {
        recordedAtISO = new Date(recordedAt).toISOString();
      }
    } catch (e) {
      console.error('Error parsing recordedAt:', e);
      setError('Invalid date format for Recorded At.');
      setIsSubmitting(false);
      return;
    }

    const materialData = {
      title,
      filePath,
      recordedAt: recordedAtISO,
      memo,
      tags: tagsArray,
      fileFormat: fileFormat || null,
      sampleRate: sampleRate ? parseInt(String(sampleRate), 10) : null,
      bitDepth: bitDepth ? parseInt(String(bitDepth), 10) : null,
      latitude: latitude ? parseFloat(String(latitude)) : null,
      longitude: longitude ? parseFloat(String(longitude)) : null,
      locationName: locationName || null,
      rating: rating ? parseInt(String(rating), 10) : null,
    };

    try {
      const response = await fetch('/api/materials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(materialData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      alert('Material saved successfully!');
      router.push('/materials');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error('Failed to save material:', err);
      setError(err.message || 'An unknown error occurred.');
    } finally {
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

      <form data-testid="new-material-form" onSubmit={handleSubmit} className="space-y-8 md:max-w-3xl">
        {/* Section 1: File "Path" Input (Manual) */}
        <div className="space-y-4 p-6 border rounded-lg">
          <h2 className="text-xl font-semibold">Audio File Path</h2>
           <div className="space-y-2">
            <Label htmlFor="filePath">File Path (Manual Input)</Label>
            <Input 
              id="filePath" 
              value={filePath} 
              onChange={(e) => setFilePath(e.target.value)} 
              placeholder="e.g., /server/path/to/audiofile.wav" 
              required
            />
            <p className="text-xs text-muted-foreground">
              Note: Actual file upload will be implemented later. Please enter the server path manually.
            </p>
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

        {/* Section 3: Technical Metadata */}
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
        
        {/* Section 5: Location */}
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

        {/* Section 6: Tags & Rating */}
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

        {/* Section 7: Memo */}
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
            <Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button>
          </Link>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Material'}
          </Button>
        </div>
      </form>
    </div>
  );
} 

