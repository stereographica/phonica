'use client';

import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MaterialDetailModal } from '../MaterialDetailModal';
import fetchMock from 'jest-fetch-mock';

fetchMock.enableMocks();

// Mock Radix UI Dialog components (This section will be removed)
// jest.mock('@/components/ui/dialog', () => ({
//   Dialog: ({ children, open }: { children: React.ReactNode, open: boolean }) => open ? <div>{children}</div> : null,
//   DialogContent: ({ children, ...props }: { children: React.ReactNode, [key: string]: any }) => <div {...props}>{children}</div>,
//   DialogHeader: ({ children, ...props }: { children: React.ReactNode, [key: string]: any }) => <div {...props}>{children}</div>,
//   DialogTitle: ({ children, ...props }: { children: React.ReactNode, [key: string]: any }) => <h2 {...props}>{children}</h2>,
//   DialogDescription: ({ children, ...props }: { children: React.ReactNode, [key: string]: any }) => <p {...props}>{children}</p>,
//   DialogFooter: ({ children, ...props }: { children: React.ReactNode, [key: string]: any }) => <div {...props}>{children}</div>,
// }));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/', 
  useSearchParams: () => new URLSearchParams(),
}));

// Mock useToast
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

// Updated Mock for next/dynamic with React.Suspense
jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: <T extends Record<string, unknown>>(
    loader: () => Promise<{ default: React.ComponentType<T> }>, 
    options?: { loading?: () => React.ReactNode }
  ) => {
    // loader is a function that returns a Promise to the component.
    const LazyComponent = React.lazy(loader);
    
    const DynamicMockComponent = (props: T) => (
      <React.Suspense fallback={options?.loading ? options.loading() : <div data-testid="dynamic-fallback">Loading...</div>}>
        <LazyComponent {...props} />
      </React.Suspense>
    );
    // Attempt to give it a display name for easier debugging if needed
    // const displayName = LazyComponent.displayName || LazyComponent.name || 'DynamicComponent';
    // DynamicMockComponent.displayName = `DynamicMock(${displayName})`;
    DynamicMockComponent.displayName = 'DynamicMock'; // Simpler for now
    return DynamicMockComponent;
  },
}));

// Specific mocks for components loaded by next/dynamic
// The general next/dynamic mock above should handle these now, so these specific mocks might become redundant
// or might need to return the component directly if the dynamic loader isn't being hit as expected.
// For now, we assume the general mock handles them. If tests fail for these, we might need to adjust.
const MockMap = () => <div data-testid="mock-map">Mock Map Component</div>;
MockMap.displayName = 'MockMap';
jest.mock('@/components/maps/MaterialLocationMap', () => MockMap, { virtual: true });

const MockAudioPlayer = ({ audioUrl }: { audioUrl: string }) => <div data-testid="mock-audio-player">Mock Audio Player Component: {audioUrl}</div>;
MockAudioPlayer.displayName = 'MockAudioPlayer';
jest.mock('@/components/audio/AudioPlayer', () => MockAudioPlayer, { virtual: true });

// Ensure mockMaterial is defined
const mockMaterial = {
  id: "test-id-1",
  slug: "test-slug-1",
  title: "Test Material Title",
  description: "Test description",
  recordedDate: new Date().toISOString(),
  categoryName: "Test Category",
  tags: [{ id: 't1', name: 'Tag1', slug: 'tag1' }],
  filePath: "/test/audio.wav",
  fileFormat: "WAV",
  sampleRate: 48000,
  bitDepth: 16,
  latitude: 35.123,
  longitude: 139.456,
  locationName: "Test Location",
  rating: 4,
  notes: "Test notes",
  equipments: [{ id: 'e1', name: 'Mic XYZ', type: 'Microphone', manufacturer: 'AudioCorp' }],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  downloadUrl: "/api/materials/test-slug-1/download"
};

describe('Minimal MaterialDetailModal Render Test', () => {
  beforeEach(() => {
    fetchMock.resetMocks();
    jest.clearAllMocks();
  });

  it('renders the modal with a title when materialSlug is null and isOpen is true', () => {
    const handleClose = jest.fn();
    render(
      <MaterialDetailModal
        materialSlug={null}
        isOpen={true}
        onClose={handleClose}
      />
    );
    // When materialSlug is null, it should display a default title like "Material Details"
    // or "Loading Details..." depending on initial state logic.
    // Let's check for the title that appears when no slug is provided and not fetching.
    expect(screen.getByText('Material Details')).toBeInTheDocument(); 
  });
});

describe('MaterialDetailModal', () => { // Unskipped: describe.skip to describe
  beforeEach(() => {
    fetchMock.resetMocks();
    jest.clearAllMocks(); 
  });
  
  it('calls onClose when close button is clicked', async () => {
    fetchMock.mockResponseOnce(JSON.stringify(mockMaterial));
    const handleClose = jest.fn();
    render(<MaterialDetailModal materialSlug="test-id-1" isOpen={true} onClose={handleClose} />);
    await waitFor(() => expect(screen.getByText(mockMaterial.title)).toBeInTheDocument());

    // 動的コンポーネントのロードを待つ
    const audioPlayerMock = await screen.findByTestId('mock-audio-player');
    expect(audioPlayerMock).toBeInTheDocument();
    expect(audioPlayerMock).toHaveTextContent(`Mock Audio Player Component: ${mockMaterial.downloadUrl}`);

    expect(await screen.findByTestId('mock-map')).toBeInTheDocument();

    const dialogFooter = screen.getByTestId('dialog-footer');
    const closeButton = within(dialogFooter).getByRole('button', { name: /Close/i });
    fireEvent.click(closeButton);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  // ... (Rest of the original tests for MaterialDetailModal would be here)
}); 
