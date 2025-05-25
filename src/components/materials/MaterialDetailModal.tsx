'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle } from 'lucide-react'; // アイコンを追加
import dynamic from 'next/dynamic'; // dynamic importのため追加

// Mapコンポーネントをdynamic import (クライアントサイドでのみレンダリング)
const MaterialLocationMap = dynamic(() => import('@/components/maps/MaterialLocationMap'), {
  ssr: false,
  loading: () => <div style={{ height: '300px', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading map...</div>,
});

const AudioPlayer = dynamic(() => import('@/components/audio/AudioPlayer'), {
  ssr: false,
  loading: () => <div style={{ height: '140px', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #ccc', borderRadius: 'md' }}>Loading audio player...</div>,
});

// APIから返される想定の型 (APIルートのresponseDataに合わせる)
// この型はAPIと共有するか、別途typesファイルで定義するのが望ましい
interface DetailedMaterial {
  id: string;
  slug: string;
  title: string;
  description: string | null; // API側で material.memo をマップ
  recordedDate: string; // ISO文字列
  categoryName: string | null;
  tags: { id: string; name: string; slug: string }[];
  filePath: string;
  fileFormat: string | null;
  sampleRate: number | null;
  bitDepth: number | null;
  latitude: number | null;
  longitude: number | null;
  locationName: string | null;
  rating: number | null;
  notes: string | null; // API側で material.memo をマップ
  equipments: { id: string; name: string; type: string; manufacturer: string | null }[];
  createdAt: string; // ISO文字列
  updatedAt: string; // ISO文字列
  // 他にもAPIから返されるフィールドがあれば追加
}

interface MaterialDetailModalProps {
  materialSlug: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function MaterialDetailModal({ materialSlug, isOpen, onClose }: MaterialDetailModalProps) {
  const [detailedMaterial, setDetailedMaterial] = useState<DetailedMaterial | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchMaterialDetails = useCallback(async (slug: string) => {
    // console.log(`[Modal DEBUG] fetchMaterialDetails START - slug: ${slug}`); // デバッグログは必要に応じて有効化
    setIsFetching(true);
    setFetchError(null);
    setDetailedMaterial(null); 
    try {
      const response = await fetch(`/api/materials/${slug}`);
      // console.log(`[Modal DEBUG] fetchMaterialDetails - response status: ${response.status} for slug: ${slug}`);
      if (!response.ok) {
        let errorMsg = `Failed to fetch material details: ${response.statusText}`;
        try {
            const errorData = await response.json();
            errorMsg = errorData.error || errorMsg;
            // console.error(`[Modal DEBUG] fetchMaterialDetails - NOT OK, errorData:`, errorData);
        } catch {
            // console.error(`[Modal DEBUG] fetchMaterialDetails - NOT OK, but failed to parse error JSON:`, jsonError); // jsonError 変数を使用しないため削除
        }
        throw new Error(errorMsg);
      }
      const data: DetailedMaterial = await response.json();
      // console.log(`[Modal DEBUG] fetchMaterialDetails - SUCCESS, data for slug ${slug}:`, data?.title);
      setDetailedMaterial(data);
    } catch (error) {
      // console.error(`[Modal DEBUG] fetchMaterialDetails - CATCH block for slug ${slug}:`, error);
      setFetchError(error instanceof Error ? error.message : 'An unknown error occurred');
    }
    setIsFetching(false);
    // console.log(`[Modal DEBUG] fetchMaterialDetails END - slug: ${slug}`);
  }, []);

  useEffect(() => {
    // console.log(`[Modal DEBUG] useEffect - isOpen: ${isOpen}, materialSlug: ${materialSlug}`);
    if (isOpen && materialSlug) {
      // console.log(`[Modal DEBUG] useEffect - CALLING fetchMaterialDetails for slug: ${materialSlug}`);
      fetchMaterialDetails(materialSlug);
    } else if (!isOpen) {
        // console.log('[Modal DEBUG] useEffect - Modal closed, resetting states (indirectly via handleClose or onOpenChange)');
    } else if (!materialSlug) {
        // console.log('[Modal DEBUG] useEffect - materialSlug is null, not fetching.');
        setDetailedMaterial(null); 
        setFetchError(null);
        setIsFetching(false);
    }
  }, [isOpen, materialSlug, fetchMaterialDetails]);

  const handleClose = () => {
    // console.log('[Modal DEBUG] handleClose CALLED');
    setDetailedMaterial(null);
    setFetchError(null);
    setIsFetching(false); 
    onClose();
  };

  // useEffect(() => {
  //   console.log('[Modal DEBUG] State Change: isFetching:', isFetching, 'fetchError:', fetchError, 'detailedMaterial:', detailedMaterial?.title);
  // }, [isFetching, fetchError, detailedMaterial]);

  // DialogDescriptionのためのIDを生成（あるいは固定のIDを使用）
  const titleId = "material-detail-title";
  const descriptionId = "material-detail-description";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { 
      // console.log(`[Modal DEBUG] Dialog onOpenChange - open: ${open}`);
      if (!open) handleClose(); 
    }}>
      <DialogContent 
        className="sm:max-w-[600px] md:max-w-[700px] lg:max-w-[800px]"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <DialogHeader>
          <DialogTitle id={titleId}>
            {isFetching && "Loading Details..."}
            {fetchError && !isFetching && "Error"}
            {detailedMaterial && !isFetching && !fetchError && detailedMaterial.title}
            {!detailedMaterial && !isFetching && !fetchError && "Material Details"}
          </DialogTitle>

          {/* DialogDescriptionを常時レンダリングし、内容を状態に応じて変更 */} 
          <DialogDescription id={descriptionId}>
            {isFetching && "Fetching material information, please wait."}
            {fetchError && !isFetching && `An error occurred while loading details: ${fetchError}`}
            {detailedMaterial && !isFetching && !fetchError && 
              `Recorded on: ${new Date(detailedMaterial.recordedDate).toLocaleDateString()} (Updated: ${new Date(detailedMaterial.updatedAt).toLocaleDateString()})`
            }
            {!detailedMaterial && !isFetching && !fetchError && 
              (materialSlug ? "Details will appear here once loaded." : "Please select a material to view its details.")
            }
          </DialogDescription>
        </DialogHeader>

        {isFetching && (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">Fetching details...</p>
          </div>
        )}

        {fetchError && (
          <div className="my-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              <h3 className="text-sm font-semibold text-red-700">Failed to load material details</h3>
            </div>
            <p className="text-sm text-red-600 mt-1">{fetchError}</p>
            <Button variant="outline" size="sm" onClick={() => materialSlug && fetchMaterialDetails(materialSlug)} className="mt-2">
              Try Again
            </Button>
          </div>
        )}

        {detailedMaterial && !isFetching && !fetchError && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 py-4 max-h-[75vh] overflow-y-auto pr-2">
            <div>
              <h3 className="font-semibold mb-1 text-sm">Description:</h3>
              <p className="text-sm text-muted-foreground min-h-[20px]">{detailedMaterial.description || 'N/A'}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-1 text-sm">Notes (Memo):</h3>
              <p className="text-sm text-muted-foreground min-h-[20px]">{detailedMaterial.notes || 'N/A'}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-1 text-sm">Category:</h3>
              <p className="text-sm text-muted-foreground">{detailedMaterial.categoryName || 'N/A'}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-1 text-sm">File Path:</h3>
              <p className="text-sm text-muted-foreground break-all">{detailedMaterial.filePath}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-1 text-sm">File Format:</h3>
              <p className="text-sm text-muted-foreground">{detailedMaterial.fileFormat?.toUpperCase() || 'N/A'}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-1 text-sm">Sample Rate:</h3>
              <p className="text-sm text-muted-foreground">{detailedMaterial.sampleRate ? `${detailedMaterial.sampleRate} Hz` : 'N/A'}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-1 text-sm">Bit Depth:</h3>
              <p className="text-sm text-muted-foreground">{detailedMaterial.bitDepth ? `${detailedMaterial.bitDepth}-bit` : 'N/A'}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-1 text-sm">Location:</h3>
              <p className="text-sm text-muted-foreground">
                {detailedMaterial.locationName || 'N/A'}
                {detailedMaterial.latitude && detailedMaterial.longitude && ` (Lat: ${detailedMaterial.latitude}, Lon: ${detailedMaterial.longitude})`}
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-1 text-sm">Rating:</h3>
              <p className="text-sm text-muted-foreground">{detailedMaterial.rating !== null ? `${detailedMaterial.rating} / 5` : 'N/A'}</p> {/* Assuming rating is 0-5 */} 
            </div>
            <div className="md:col-span-2">
              <h3 className="font-semibold mb-1 text-sm">Tags:</h3>
              {detailedMaterial.tags && detailedMaterial.tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {detailedMaterial.tags.map((tag) => (
                    <span key={tag.id} className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded-full">
                      {tag.name}
                    </span>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground">No tags</p>}
            </div>
            <div className="md:col-span-2">
              <h3 className="font-semibold mb-1 text-sm">Equipment Used:</h3>
              {detailedMaterial.equipments && detailedMaterial.equipments.length > 0 ? (
                <ul className="list-disc list-inside text-sm text-muted-foreground">
                  {detailedMaterial.equipments.map((eq) => (
                    <li key={eq.id}>{eq.name} ({eq.type}) {eq.manufacturer && `- ${eq.manufacturer}`}</li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted-foreground">No equipment specified</p>}
            </div>

            {detailedMaterial.latitude && detailedMaterial.longitude && (
              <div className="md:col-span-2 mt-4">
                <h3 className="font-semibold mb-2 text-sm">Recorded Location Map:</h3>
                <MaterialLocationMap
                  latitude={detailedMaterial.latitude}
                  longitude={detailedMaterial.longitude}
                  popupText={detailedMaterial.title || 'Recorded Location'}
                />
              </div>
            )}
            {(!detailedMaterial.latitude || !detailedMaterial.longitude) && (
                 <div className="md:col-span-2 mt-4">
                    <h3 className="font-semibold mb-2 text-sm">Recorded Location Map:</h3>
                    <p className="text-sm text-muted-foreground">No location data available.</p>
                </div>
            )}
            {detailedMaterial.filePath && (
              <div className="md:col-span-2 mt-4">
                <h3 className="font-semibold mb-2 text-sm">Audio Player:</h3>
                <AudioPlayer audioUrl={`/api/materials/${detailedMaterial.slug}/download`} />
              </div>
            )}
          </div>
        )}

        <DialogFooter className="mt-2" data-testid="dialog-footer">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Close
            </Button>
          </DialogClose>
          {detailedMaterial && (
            <Button
              type="button"
              variant="default"
              onClick={() => {
                if (detailedMaterial) {
                  window.location.href = `/api/materials/${detailedMaterial.slug}/download`;
                }
              }}
              disabled={!detailedMaterial}
            >
              Download File
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 
