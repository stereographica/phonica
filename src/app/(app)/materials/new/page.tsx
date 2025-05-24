'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
// import { Checkbox } from '@/components/ui/checkbox'; // Not used yet
import { ArrowLeft, Star, UploadCloud, TagsIcon, ImagePlus, MapPinIcon, LocateFixedIcon } from 'lucide-react'; // Added ImagePlus, MapPinIcon, LocateFixedIcon

export default function NewMaterialPage() {
  // TODO: フォームの状態管理 (useState or react-hook-form)
  // TODO: フォームのバリデーション
  // TODO: フォーム送信処理

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

      <form className="space-y-8 md:max-w-3xl">
        {/* Section 1: File Upload */}
        <div className="space-y-4 p-6 border rounded-lg">
          <h2 className="text-xl font-semibold">Audio File</h2>
          <div className="flex items-center justify-center w-full">
            <label
              htmlFor="dropzone-file"
              className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/80"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <UploadCloud className="w-10 h-10 mb-3 text-gray-400" />
                <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">WAV, MP3, FLAC, etc. (MAX. 1GB)</p>
              </div>
              <Input id="dropzone-file" type="file" className="hidden" />
            </label>
          </div>
          {/* TODO: アップロードされたファイル情報の表示エリア */}
        </div>

        {/* Section 2: Basic Information */}
        <div className="space-y-4 p-6 border rounded-lg">
          <h2 className="text-xl font-semibold">Basic Information</h2>
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" placeholder="e.g., Morning Chorus at Yoyogi Park" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="recordedAt">Recorded At</Label>
            <Input id="recordedAt" type="datetime-local" />
            {/* TODO: ファイルから自動入力 + 手動修正 */}
          </div>
        </div>

        {/* Section 3: Technical Metadata */}
        <div className="space-y-4 p-6 border rounded-lg">
          <h2 className="text-xl font-semibold">Technical Metadata</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fileFormat">File Format</Label>
              <Input id="fileFormat" placeholder="e.g., WAV" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sampleRate">Sample Rate (Hz)</Label>
              <Input id="sampleRate" type="number" placeholder="e.g., 48000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bitDepth">Bit Depth</Label>
              <Input id="bitDepth" type="number" placeholder="e.g., 24" />
            </div>
          </div>
          {/* TODO: ファイルから自動入力 + 手動修正 */}
        </div>

        {/* Section 4: Equipment */}
        <div className="space-y-4 p-6 border rounded-lg">
          <h2 className="text-xl font-semibold">Equipment Used</h2>
          {/* TODO: 機材選択UI (チェックボックスリスト等) */}
          <div className="p-4 bg-muted rounded-md text-sm text-muted-foreground">
            Equipment selection UI will be here. (e.g., Checkboxes for Recorders, Microphones)
          </div>
        </div>

        {/* Section 5: Location - UPDATED */}
        <div className="space-y-6 p-6 border rounded-lg">
          <h2 className="text-xl font-semibold">Location</h2>
          
          {/* Option 1: GPS Photo Upload */}
          <div className="space-y-2">
            <Label htmlFor="gps-photo-upload">Upload Photo with GPS Data (Optional)</Label>
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor="gps-photo-file"
                className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/80"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <ImagePlus className="w-8 h-8 mb-3 text-gray-400" />
                  <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-semibold">Click to upload photo</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">JPEG, PNG with EXIF GPS data</p>
                </div>
                <Input id="gps-photo-file" type="file" accept="image/jpeg,image/png" className="hidden" />
              </label>
            </div>
            {/* TODO: アップロードされた写真のプレビューと座標抽出結果表示 */}
            {/* TODO: EXIF情報から座標を読み取り、緯度・経度フィールドに自動入力する処理 */}
          </div>

          <div className="text-center my-4 text-sm text-muted-foreground">OR</div>

          {/* Option 2 & 3 combined with Manual Input for now */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="latitude">Latitude</Label>
              <Input id="latitude" type="number" step="any" placeholder="e.g., 35.681236" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="longitude">Longitude</Label>
              <Input id="longitude" type="number" step="any" placeholder="e.g., 139.767125" />
            </div>
          </div>
          <div className="space-y-2 mt-4">
            <Label htmlFor="locationName">Location Name (Optional)</Label>
            <Input id="locationName" placeholder="e.g., Yoyogi Park" />
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <Button variant="outline" type="button"> {/* TODO: 現在地取得機能 */}
              <LocateFixedIcon className="mr-2 h-4 w-4" /> Get Current Location
            </Button>
            <Button variant="outline" type="button"> {/* TODO: 地図上で指定機能 */}
              <MapPinIcon className="mr-2 h-4 w-4" /> Pin on Map
            </Button>
          </div>
        </div>

        {/* Section 6: Tags & Rating */}
        <div className="space-y-4 p-6 border rounded-lg">
          <h2 className="text-xl font-semibold">Details</h2>
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            {/* TODO: タグ入力UI (サジェスト機能付き) */}
            <div className="flex items-center border rounded-md px-3">
              <TagsIcon className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <Input id="tags" placeholder="e.g., Nature, Birds, Park (comma separated)" className="flex h-10 w-full rounded-md border-input bg-transparent py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 border-0 focus-visible:ring-offset-0 focus-visible:ring-0" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Rating</Label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Button key={star} variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                  <Star className="h-5 w-5" /> {/* TODO: 星の塗りつぶし制御 */}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Section 7: Memo */}
        <div className="space-y-4 p-6 border rounded-lg">
          <h2 className="text-xl font-semibold">Memo</h2>
          <div className="space-y-2">
            <Textarea id="memo" placeholder="Any notes about the recording situation, thoughts, etc." rows={5} />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4">
          <Link href="/materials" passHref>
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button type="submit">Save Material</Button> {/* TODO: 保存処理 */}
        </div>
      </form>
    </div>
  );
} 
