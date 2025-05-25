'use client';

import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MaterialDetailModal } from '../MaterialDetailModal';
import fetchMock from 'jest-fetch-mock';

fetchMock.enableMocks();

// Mock next/dynamic
jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: (loader: () => Promise<React.ComponentType<object>>) => {
    // @ts-expect-error: 型推論が複雑なため一時的にignore (React.lazy)
    const LazyComponent = React.lazy(loader);
    const WrappedComponent = (props: React.PropsWithChildren<unknown>) => (
      <React.Suspense fallback={<div>Loading dynamic component...</div>}>
        <LazyComponent {...props} />
      </React.Suspense>
    );
    WrappedComponent.displayName = 'DynamicMock';
    return WrappedComponent;
  },
}));

const MockMap = () => <div data-testid="mock-map">Mock Map</div>;
MockMap.displayName = 'MockMap';
jest.mock('@/components/maps/MaterialLocationMap', () => MockMap);

const MockAudioPlayer = ({ audioUrl }: { audioUrl: string }) => <div data-testid="mock-audio-player">Mock Audio Player: {audioUrl}</div>;
MockAudioPlayer.displayName = 'MockAudioPlayer';
jest.mock('@/components/audio/AudioPlayer', () => MockAudioPlayer);

const mockMaterial = {
  id: 'test-id-1',
  slug: 'test-material-slug',
  title: 'Test Material Title',
  description: 'Test description',
  recordedDate: new Date().toISOString(),
  categoryName: 'Test Category',
  tags: [{ id: 'tag1', name: 'Tag1', slug: 'tag1' }],
  filePath: '/test/audio.wav',
  fileFormat: 'WAV',
  sampleRate: 48000,
  bitDepth: 16,
  latitude: 35.123,
  longitude: 139.456,
  locationName: 'Test Location',
  rating: 4,
  notes: 'Test notes',
  equipments: [{ id: 'eq1', name: 'Mic XY', type: 'Microphone', manufacturer: 'Sony' }],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('MaterialDetailModal', () => {
  let originalLocation: Location;

  beforeEach(() => {
    fetchMock.resetMocks();
    const mockIntersectionObserver = jest.fn();
    mockIntersectionObserver.mockReturnValue({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    });
    window.IntersectionObserver = mockIntersectionObserver;

    originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { assign: jest.fn(), href: '' }, 
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
  });

  it('renders loading state initially when opened with a materialSlug', async () => {
    fetchMock.mockResponseOnce(JSON.stringify(mockMaterial));
    render(<MaterialDetailModal materialSlug="test-id-1" isOpen={true} onClose={jest.fn()} />);
    expect(screen.getByText('Loading Details...')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Loading Details...')).not.toBeInTheDocument());
  });

  it('displays material details after successful fetch', async () => {
    fetchMock.mockResponseOnce(JSON.stringify(mockMaterial));
    render(<MaterialDetailModal materialSlug="test-id-1" isOpen={true} onClose={jest.fn()} />);
    
    await waitFor(() => {
      expect(screen.getByText(mockMaterial.title)).toBeInTheDocument();
    });
    expect(screen.getByText(mockMaterial.description!)).toBeInTheDocument();
    expect(screen.getByText(/Recorded on:/)).toBeInTheDocument();
    expect(screen.getByText(mockMaterial.categoryName!)).toBeInTheDocument();
    expect(screen.getByText('Tag1')).toBeInTheDocument();
    expect(screen.getByText(mockMaterial.filePath)).toBeInTheDocument();
    expect(screen.getByText(mockMaterial.fileFormat!.toUpperCase())).toBeInTheDocument(); 
  });

  it('displays error message if fetch fails and allows retry', async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ error: 'Failed to fetch' }), { status: 500 });
    render(<MaterialDetailModal materialSlug="test-id-1" isOpen={true} onClose={jest.fn()} />);
    
    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument(); 
    });
    expect(screen.getByText(/Failed to load material details/)).toBeInTheDocument();
    expect(screen.getByText('Failed to fetch')).toBeInTheDocument();
    const retryButton = screen.getByText('Try Again');
    expect(retryButton).toBeInTheDocument();

    // Setup for successful retry
    fetchMock.mockResponseOnce(JSON.stringify(mockMaterial)); 
    fireEvent.click(retryButton);

    await waitFor(() => {
        expect(screen.queryByText('Error')).not.toBeInTheDocument();
        expect(screen.getByText(mockMaterial.title)).toBeInTheDocument();
    });
  });

  it('does not fetch if materialSlug is null', () => {
    render(<MaterialDetailModal materialSlug={null} isOpen={true} onClose={jest.fn()} />);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText('Material Details')).toBeInTheDocument(); 
  });
  
  it('calls onClose when close button is clicked', async () => {
    fetchMock.mockResponseOnce(JSON.stringify(mockMaterial));
    const handleClose = jest.fn();
    render(<MaterialDetailModal materialSlug="test-id-1" isOpen={true} onClose={handleClose} />);
    await waitFor(() => expect(screen.getByText(mockMaterial.title)).toBeInTheDocument());

    const dialogFooter = screen.getByTestId('dialog-footer');
    const closeButton = within(dialogFooter).getByRole('button', { name: 'Close' });
    fireEvent.click(closeButton);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('download button is enabled when material is loaded and navigates on click', async () => {
    fetchMock.mockResponseOnce(JSON.stringify(mockMaterial));

    render(<MaterialDetailModal materialSlug={mockMaterial.slug} isOpen={true} onClose={jest.fn()} />);
    
    let downloadButton: HTMLElement | null = null;
    await waitFor(() => {
      downloadButton = screen.getByText('Download File');
      expect(downloadButton).toBeInTheDocument();
      expect(downloadButton).not.toBeDisabled();
    });
    
    if (downloadButton) {
        fireEvent.click(downloadButton);
        expect(window.location.href).toBe(`/api/materials/${mockMaterial.slug}/download`);
    } else {
        throw new Error('Download button not found after material loaded');
    }
  });

  it('download button is not present if materialSlug is null', async () => {
    render(
      <MaterialDetailModal materialSlug={null} isOpen={true} onClose={jest.fn()} />
    );
    expect(screen.queryByRole('button', { name: /Download File/i })).not.toBeInTheDocument();
  });

  it('renders map and audio player when data is available', async () => {
    const materialWithSlug = { ...mockMaterial, slug: "test-id-1" };
    fetchMock.mockResponseOnce(JSON.stringify(materialWithSlug));
    render(<MaterialDetailModal materialSlug="test-id-1" isOpen={true} onClose={jest.fn()} />);
    await waitFor(() => {
      expect(screen.getByTestId('mock-map')).toBeInTheDocument();
      expect(screen.getByTestId('mock-audio-player')).toBeInTheDocument();
      expect(screen.getByTestId('mock-audio-player')).toHaveTextContent(`Mock Audio Player: /api/materials/${materialWithSlug.slug}/download`);
    });
  });

  it('shows "No location data available." if latitude/longitude are null', async () => {
    const materialWithoutLocation = { ...mockMaterial, latitude: null, longitude: null };
    fetchMock.mockResponseOnce(JSON.stringify(materialWithoutLocation));
    render(<MaterialDetailModal materialSlug="test-id-1" isOpen={true} onClose={jest.fn()} />);
    await waitFor(() => {
      expect(screen.getByText('No location data available.')).toBeInTheDocument();
      expect(screen.queryByTestId('mock-map')).not.toBeInTheDocument();
    });
  });

  it('does not render audio player if filePath is null', async () => {
    const materialWithoutAudio = { ...mockMaterial, filePath: null };
    fetchMock.mockResponseOnce(JSON.stringify(materialWithoutAudio));
    render(<MaterialDetailModal materialSlug="test-id-1" isOpen={true} onClose={jest.fn()} />);
    await waitFor(() => {
      expect(screen.queryByTestId('mock-audio-player')).not.toBeInTheDocument();
    });
  });

  it('handles fetch error with non-JSON response', async () => {
    fetchMock.mockResponseOnce("Server Error Text", { status: 503 });
    render(<MaterialDetailModal materialSlug="test-id-1" isOpen={true} onClose={jest.fn()} />);
    
    let errorContainer: HTMLElement | null = null;
    await waitFor(() => {
      // エラーメッセージが表示される親コンテナを特定
      errorContainer = screen.getByText('Failed to load material details').closest('div.my-4');
      expect(errorContainer).toBeInTheDocument();
      expect(within(errorContainer!).getByText(/Failed to fetch material details: Service Unavailable|An unknown error occurred|Server Error Text/)).toBeInTheDocument();
    });
  });

  it('does not call fetchMaterialDetails if isOpen is false', () => {
    render(<MaterialDetailModal materialSlug="test-slug" isOpen={false} onClose={jest.fn()} />);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refetches when materialSlug changes and modal is open', async () => {
    fetchMock.mockResponses(
      [JSON.stringify({ ...mockMaterial, slug: 'slug1', title: 'First Call' }), { status: 200 }],
      [JSON.stringify({ ...mockMaterial, slug: 'slug2', title: 'Second Call' }), { status: 200 }]
    );

    const { rerender } = render(
      <MaterialDetailModal materialSlug="slug1" isOpen={true} onClose={jest.fn()} />
    );

    await waitFor(() => expect(screen.getByText('First Call')).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenLastCalledWith('/api/materials/slug1');

    rerender(<MaterialDetailModal materialSlug="slug2" isOpen={true} onClose={jest.fn()} />);

    await waitFor(() => expect(screen.getByText('Second Call')).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(2); // Ensures a new fetch occurred
    expect(fetchMock).toHaveBeenLastCalledWith('/api/materials/slug2');
  });

  it('displays a generic error message if fetch throws a non-standard error', async () => {
    fetchMock.mockRejectOnce(new Error("Network Error"));

    render(<MaterialDetailModal materialSlug="test-slug" isOpen={true} onClose={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText(/Failed to load material details/)).toBeInTheDocument();
      expect(screen.getByText("Network Error")).toBeInTheDocument();
    });
  });
  
  it('displays a generic error message if fetch throws an unknown error object', async () => {
    fetchMock.mockImplementationOnce(() => Promise.reject({})); // Simulate an empty object error

    render(<MaterialDetailModal materialSlug="test-slug" isOpen={true} onClose={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText(/Failed to load material details/)).toBeInTheDocument();
      expect(screen.getByText("An unknown error occurred")).toBeInTheDocument();
    });
  });

  // Test for DialogHeader states
  it('renders correct DialogTitle based on fetching, error and data state', async () => {
    // 1. Initial loading state
    fetchMock.mockResponseOnce(() => new Promise(resolve => setTimeout(() => resolve(JSON.stringify(mockMaterial)), 50)));
    const { rerender } = render(<MaterialDetailModal materialSlug="test-id-1" isOpen={true} onClose={jest.fn()} />);
    expect(screen.getByText('Loading Details...')).toBeInTheDocument();
    
    // 2. Loaded state
    await waitFor(() => expect(screen.getByText(mockMaterial.title)).toBeInTheDocument());
    expect(screen.queryByText('Loading Details...')).not.toBeInTheDocument();
    expect(screen.queryByText('Error')).not.toBeInTheDocument();
    expect(screen.getByText(/Recorded on:/)).toBeInTheDocument(); // DialogDescription also

    // 3. Error state
    fetchMock.mockRejectOnce(new Error('Fetch error for title test'));
    rerender(<MaterialDetailModal materialSlug="test-id-2" isOpen={true} onClose={jest.fn()} />);
    await waitFor(() => expect(screen.getByText('Error')).toBeInTheDocument());
    expect(screen.queryByText('Loading Details...')).not.toBeInTheDocument();
    expect(screen.queryByText(mockMaterial.title)).not.toBeInTheDocument(); // Previous title should be gone
    expect(screen.queryByText(/Recorded on:/)).not.toBeInTheDocument();

    // 4. No materialSlug (initial state without triggering fetch)
    // Note: prop name is materialSlug now
    rerender(<MaterialDetailModal materialSlug={null} isOpen={true} onClose={jest.fn()} />);
    expect(screen.getByText('Material Details')).toBeInTheDocument(); // Default title
    expect(screen.queryByText('Loading Details...')).not.toBeInTheDocument();
    expect(screen.queryByText('Error')).not.toBeInTheDocument();
  });

  describe('Detailed Information Display', () => {
    it('renders N/A for optional fields when they are null or empty in detailedMaterial', async () => {
      const partialMaterial = {
        ...mockMaterial,
        slug: 'partial-slug',
        description: null,
        tags: [],
        equipments: [],
        locationName: null,
        rating: null,
      };
      fetchMock.mockResponseOnce(JSON.stringify(partialMaterial));
      render(<MaterialDetailModal materialSlug="partial-slug" isOpen={true} onClose={jest.fn()} />);

      await waitFor(() => expect(screen.getByText(partialMaterial.title)).toBeInTheDocument());
      
      const descriptionElement = screen.getByText('Description:').closest('div')?.querySelector('p.text-muted-foreground');
      expect(descriptionElement).toHaveTextContent('N/A');

      expect(screen.getByText('Tags:').closest('div')?.querySelector('p.text-muted-foreground')).toHaveTextContent('No tags');

      expect(screen.getByText('Equipment Used:').closest('div')?.querySelector('p.text-muted-foreground')).toHaveTextContent('No equipment specified');

      const ratingSection = screen.getByText(/Rating:/).closest('div');
      expect(ratingSection).not.toBeNull();
      expect(ratingSection?.querySelector('p.text-muted-foreground')).toHaveTextContent('N/A');
      expect(ratingSection?.querySelectorAll('svg.lucide-star').length).toBe(0);
    });

    it('correctly displays file metadata', async () => {
        const fileMetaMaterial = {
            ...mockMaterial,
            slug: 'file-meta-slug',
            fileFormat: 'MP3',
            sampleRate: 44100,
            bitDepth: 16,
        }
        fetchMock.mockResponseOnce(JSON.stringify(fileMetaMaterial));
        render(<MaterialDetailModal materialSlug="file-meta-slug" isOpen={true} onClose={jest.fn()} />);

        await waitFor(() => screen.getByText(fileMetaMaterial.title));
        expect(screen.getByText(/File Format:/).closest('div')?.querySelector('p.text-muted-foreground')).toHaveTextContent('MP3');
        expect(screen.getByText(/Sample Rate:/).closest('div')?.querySelector('p.text-muted-foreground')).toHaveTextContent('44100 Hz');
        expect(screen.getByText(/Bit Depth:/).closest('div')?.querySelector('p.text-muted-foreground')).toHaveTextContent('16-bit');
    });
  });

  describe('DialogHeader States', () => {
    it('shows only "Loading Details..." title when fetching', async () => {
      fetchMock.mockResponseOnce(() => new Promise(resolve => setTimeout(() => resolve(JSON.stringify(mockMaterial)), 10)));
      render(<MaterialDetailModal materialSlug="test-slug" isOpen={true} onClose={jest.fn()} />);
      expect(screen.getByText('Loading Details...')).toBeInTheDocument();
      expect(screen.queryByText('Error')).not.toBeInTheDocument();
      expect(screen.queryByText(mockMaterial.title)).not.toBeInTheDocument();
      expect(screen.queryByText(/Recorded on:/)).not.toBeInTheDocument();
      await waitFor(() => expect(screen.queryByText('Loading Details...')).not.toBeInTheDocument());
    });

    it('shows only "Error" title and no description when fetchError is present and not fetching', async () => {
      fetchMock.mockRejectOnce(new Error("Fetch failed"));
      render(<MaterialDetailModal materialSlug="test-slug" isOpen={true} onClose={jest.fn()} />);
      await waitFor(() => expect(screen.getByText('Error')).toBeInTheDocument());
      expect(screen.queryByText('Loading Details...')).not.toBeInTheDocument();
      expect(screen.queryByText(mockMaterial.title)).not.toBeInTheDocument();
      expect(screen.queryByText(/Recorded on:/)).not.toBeInTheDocument();
    });

    it('shows material title and description when material is loaded and no error/fetching', async () => {
      fetchMock.mockResponseOnce(JSON.stringify(mockMaterial));
      render(<MaterialDetailModal materialSlug="test-slug" isOpen={true} onClose={jest.fn()} />);
      await waitFor(() => expect(screen.getByText(mockMaterial.title)).toBeInTheDocument());
      expect(screen.getByText(new RegExp(`Recorded on: ${new Date(mockMaterial.recordedDate).toLocaleDateString()}`))).toBeInTheDocument();
      expect(screen.queryByText('Loading Details...')).not.toBeInTheDocument();
      expect(screen.queryByText('Error')).not.toBeInTheDocument();
    });
    
    it('shows "Material Details" title when no material, no error, and not fetching (e.g., materialSlug is null)', () => {
      render(<MaterialDetailModal materialSlug={null} isOpen={true} onClose={jest.fn()} />);
      expect(screen.getByText('Material Details')).toBeInTheDocument();
      expect(screen.queryByText('Loading Details...')).not.toBeInTheDocument();
      expect(screen.queryByText('Error')).not.toBeInTheDocument();
      expect(screen.queryByText(mockMaterial.title)).not.toBeInTheDocument();
      expect(screen.queryByText(/Recorded on:/)).not.toBeInTheDocument();
    });
  });

  describe('Fallback Data Display for DetailedMaterial Fields', () => {
    const baseMockData = { 
      ...mockMaterial, // includes filePath, recordedDate, updatedAt, title
      slug: 'fallback-fields-test', 
      id: 'fallback-id',
    };

    it('handles null for description, notes, categoryName, fileFormat, sampleRate, bitDepth, locationName, rating and empty tags/equipments', async () => {
      const materialWithManyNulls = {
        ...baseMockData,
        description: null,
        notes: null,
        categoryName: null,
        fileFormat: null,
        sampleRate: null,
        bitDepth: null,
        latitude: null, 
        longitude: null,
        locationName: null,
        rating: null,
        tags: [],
        equipments: [],
      };
      fetchMock.mockResponseOnce(JSON.stringify(materialWithManyNulls));
      render(<MaterialDetailModal materialSlug="fallback-fields-test" isOpen={true} onClose={jest.fn()} />);
      
      await waitFor(() => expect(screen.getByText(materialWithManyNulls.title)).toBeInTheDocument());

      expect(screen.getByText('Description:').closest('div')?.querySelector('p.text-muted-foreground')?.textContent).toBe('N/A');
      expect(screen.getByText('Notes (Memo):').closest('div')?.querySelector('p.text-muted-foreground')?.textContent).toBe('N/A');
      expect(screen.getByText('Category:').closest('div')?.querySelector('p.text-muted-foreground')?.textContent).toBe('N/A');
      expect(screen.getByText('File Format:').closest('div')?.querySelector('p.text-muted-foreground')?.textContent).toBe('N/A');
      expect(screen.getByText('Sample Rate:').closest('div')?.querySelector('p.text-muted-foreground')?.textContent).toBe('N/A');
      expect(screen.getByText('Bit Depth:').closest('div')?.querySelector('p.text-muted-foreground')?.textContent).toBe('N/A');
      
      const locationDiv = screen.getByText('Location:').closest('div');
      expect(locationDiv?.querySelector('p.text-muted-foreground')?.textContent?.trim()).toBe('N/A');
      expect(locationDiv?.querySelector('p.text-muted-foreground')?.textContent).not.toContain('Lat:');

      expect(screen.getByText(/Rating:/).closest('div')?.querySelector('p.text-muted-foreground')?.textContent).toBe('N/A');
      expect(screen.getByText('Tags:').closest('div')?.querySelector('p.text-muted-foreground')?.textContent).toBe('No tags');
      expect(screen.getByText('Equipment Used:').closest('div')?.querySelector('p.text-muted-foreground')?.textContent).toBe('No equipment specified');

      // Map and Audio Player fallbacks
      expect(screen.getByText('Recorded Location Map:').closest('div')?.querySelector('p.text-muted-foreground')).toHaveTextContent('No location data available.');
      // Audio player should still render if filePath is present in baseMockData
      expect(screen.getByText('Audio Player:')).toBeInTheDocument();
      expect(screen.getByTestId('mock-audio-player')).toBeInTheDocument();
    });

    it('displays rating correctly when it is 0', async () => {
      const materialWithZeroRating = { ...baseMockData, rating: 0 };
      fetchMock.mockResponseOnce(JSON.stringify(materialWithZeroRating));
      render(<MaterialDetailModal materialSlug="fallback-fields-test" isOpen={true} onClose={jest.fn()} />); // slug should be unique for mock or reset mocks
      await waitFor(() => expect(screen.getByText(materialWithZeroRating.title)).toBeInTheDocument());
      expect(screen.getByText(/Rating:/).closest('div')?.querySelector('p.text-muted-foreground')?.textContent).toBe('0 / 5');
    });
  });

  // DialogFooterのテスト
  describe('DialogFooter States', () => {
    it('Download button is disabled or not present if detailedMaterial is null (during fetch or error)', async () => {
      fetchMock.mockResponseOnce(() => new Promise(resolve => setTimeout(() => resolve(JSON.stringify(mockMaterial)), 50)));
      const { rerender } = render(<MaterialDetailModal materialSlug="test-slug" isOpen={true} onClose={jest.fn()} />);
      
      let downloadButton = screen.queryByRole('button', { name: /Download File/i });
      if (downloadButton) {
          expect(downloadButton).toBeDisabled();
      } else {
          expect(downloadButton).not.toBeInTheDocument(); // Fallback: If not rendered at all when no material
      }

      fetchMock.resetMocks(); // Reset for the next fetch mock
      fetchMock.mockRejectOnce(new Error("Fetch failed for footer"));
      rerender(<MaterialDetailModal materialSlug="test-slug-error" isOpen={true} onClose={jest.fn()} />);
      await waitFor(() => expect(screen.getByText('Error')).toBeInTheDocument());
      downloadButton = screen.queryByRole('button', { name: /Download File/i });
       if (downloadButton) {
          expect(downloadButton).toBeDisabled();
      } else {
          expect(downloadButton).not.toBeInTheDocument();
      }
    });

     it('Download button is enabled and visible when detailedMaterial is loaded', async () => {
      fetchMock.mockResponseOnce(JSON.stringify(mockMaterial));
      render(<MaterialDetailModal materialSlug="test-slug" isOpen={true} onClose={jest.fn()} />);
      await waitFor(() => expect(screen.getByText(mockMaterial.title)).toBeInTheDocument());
      const downloadButton = screen.getByRole('button', { name: /Download File/i });
      expect(downloadButton).toBeInTheDocument();
      expect(downloadButton).toBeEnabled();
    });
  });

}); 
