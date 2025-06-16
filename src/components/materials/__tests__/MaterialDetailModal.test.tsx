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
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock useNotification
const mockNotifyError = jest.fn();
const mockNotifySuccess = jest.fn();
jest.mock('@/hooks/use-notification', () => ({
  useNotification: () => ({
    notifyError: mockNotifyError,
    notifySuccess: mockNotifySuccess,
  }),
}));

// Updated Mock for next/dynamic with React.Suspense
jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: <T extends Record<string, unknown>>(
    loader: () => Promise<{ default: React.ComponentType<T> }>,
    options?: { loading?: () => React.ReactNode },
  ) => {
    // loader is a function that returns a Promise to the component.
    const LazyComponent = React.lazy(loader);

    const DynamicMockComponent = (props: T) => (
      <React.Suspense
        fallback={
          options?.loading ? (
            options.loading()
          ) : (
            <div data-testid="dynamic-fallback">Loading...</div>
          )
        }
      >
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

const MockAudioPlayer = ({ audioUrl }: { audioUrl: string }) => (
  <div data-testid="mock-audio-player">Mock Audio Player Component: {audioUrl}</div>
);
MockAudioPlayer.displayName = 'MockAudioPlayer';
jest.mock('@/components/audio/AudioPlayer', () => MockAudioPlayer, { virtual: true });

// StarRating のモック
jest.mock(
  '@/components/ui/star-rating',
  () => ({
    StarRating: ({ value }: { value: number; readOnly?: boolean }) => (
      <div data-testid="star-rating" aria-label={`Rating: ${value} out of 5 stars`}>
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} data-testid={`star-${i + 1}`}>
            {i < value ? '★' : '☆'}
          </span>
        ))}
      </div>
    ),
  }),
  { virtual: true },
);

// Ensure mockMaterial is defined
const mockMaterial = {
  id: 'test-id-1',
  slug: 'test-slug-1',
  title: 'Test Material Title',
  description: 'Test description',
  recordedDate: '2023-01-15T10:30:00Z',
  categoryName: 'Test Category',
  tags: [{ id: 't1', name: 'Tag1', slug: 'tag1' }],
  filePath: '/test/audio.wav',
  fileFormat: 'WAV',
  sampleRate: 48000,
  bitDepth: 16,
  latitude: 35.123,
  longitude: 139.456,
  locationName: 'Test Location',
  rating: 4,
  notes: 'Test notes',
  equipments: [{ id: 'e1', name: 'Mic XYZ', type: 'Microphone', manufacturer: 'AudioCorp' }],
  createdAt: '2023-01-15T10:30:00Z',
  updatedAt: '2023-01-15T10:30:00Z',
  downloadUrl: '/api/materials/test-slug-1/download',
};

describe('Minimal MaterialDetailModal Render Test', () => {
  beforeEach(() => {
    fetchMock.resetMocks();
    jest.clearAllMocks();
  });

  it('renders the modal with a title when materialSlug is null and isOpen is true', () => {
    const handleClose = jest.fn();
    render(<MaterialDetailModal materialSlug={null} isOpen={true} onClose={handleClose} />);
    // When materialSlug is null, it should display a default title like "Material Details"
    // or "Loading Details..." depending on initial state logic.
    // Let's check for the title that appears when no slug is provided and not fetching.
    expect(screen.getByText('Material Details')).toBeInTheDocument();
  });
});

describe('MaterialDetailModal', () => {
  // Unskipped: describe.skip to describe
  beforeEach(() => {
    fetchMock.resetMocks();
    jest.clearAllMocks();
    mockNotifyError.mockClear();
    mockNotifySuccess.mockClear();
    mockPush.mockClear();

    // Clean up any existing DOM elements
    document.body.innerHTML = '';
  });

  it('calls onClose when close button is clicked', async () => {
    fetchMock.mockResponseOnce(JSON.stringify(mockMaterial));
    const handleClose = jest.fn();
    render(<MaterialDetailModal materialSlug="test-id-1" isOpen={true} onClose={handleClose} />);
    await waitFor(() => expect(screen.getByText(mockMaterial.title)).toBeInTheDocument());

    // 動的コンポーネントのロードを待つ
    const audioPlayerMock = await screen.findByTestId('mock-audio-player');
    expect(audioPlayerMock).toBeInTheDocument();
    expect(audioPlayerMock).toHaveTextContent(
      `Mock Audio Player Component: ${mockMaterial.downloadUrl}`,
    );

    expect(await screen.findByTestId('mock-map')).toBeInTheDocument();

    const dialogFooter = screen.getByTestId('dialog-footer');
    const closeButton = within(dialogFooter).getByRole('button', { name: /Close/i });
    fireEvent.click(closeButton);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('handles fetch error with JSON error response', async () => {
    const errorResponse = { error: 'Material not found' };
    fetchMock.mockResponseOnce(JSON.stringify(errorResponse), { status: 404 });

    render(<MaterialDetailModal materialSlug="test-id-1" isOpen={true} onClose={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
    });
  });

  it('handles fetch error without JSON error response', async () => {
    fetchMock.mockResponseOnce('Not Found', { status: 404, statusText: 'Not Found' });

    render(<MaterialDetailModal materialSlug="test-id-1" isOpen={true} onClose={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
    });
  });

  it('handles non-Error exceptions in fetch', async () => {
    fetchMock.mockRejectOnce(new Error('Network error'));

    render(<MaterialDetailModal materialSlug="test-id-1" isOpen={true} onClose={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
    });
  });

  it('handles delete operation successfully', async () => {
    fetchMock.mockResponseOnce(JSON.stringify(mockMaterial));
    const handleClose = jest.fn();
    const handleDeleted = jest.fn();
    mockNotifyError.mockClear();
    mockNotifySuccess.mockClear();

    render(
      <MaterialDetailModal
        materialSlug="test-id-1"
        isOpen={true}
        onClose={handleClose}
        onMaterialDeleted={handleDeleted}
      />,
    );

    await waitFor(() => expect(screen.getByText(mockMaterial.title)).toBeInTheDocument());

    // Click delete button
    const deleteButton = screen.getByRole('button', { name: /Delete/i });
    fireEvent.click(deleteButton);

    // Confirm delete in modal
    await waitFor(() => {
      const confirmButton = screen.getByRole('button', { name: /^Delete$/i });
      expect(confirmButton).toBeInTheDocument();
    });

    fetchMock.mockResponseOnce(JSON.stringify({ success: true }));

    const confirmButton = screen.getByRole('button', { name: /^Delete$/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockNotifySuccess).toHaveBeenCalledWith('delete', 'material');
      expect(handleDeleted).toHaveBeenCalled();
      expect(handleClose).toHaveBeenCalled();
    });
  });

  it('handles delete operation with error', async () => {
    fetchMock.mockResponseOnce(JSON.stringify(mockMaterial));
    mockNotifyError.mockClear();
    mockNotifySuccess.mockClear();

    render(<MaterialDetailModal materialSlug="test-id-1" isOpen={true} onClose={jest.fn()} />);

    await waitFor(() => expect(screen.getByText(mockMaterial.title)).toBeInTheDocument());

    // Click delete button
    const deleteButton = screen.getByRole('button', { name: /Delete/i });
    fireEvent.click(deleteButton);

    // Wait for delete modal
    await waitFor(() => {
      const confirmButton = screen.getByRole('button', { name: /^Delete$/i });
      expect(confirmButton).toBeInTheDocument();
    });

    fetchMock.mockResponseOnce(JSON.stringify({ error: 'Permission denied' }), { status: 403 });

    const confirmButton = screen.getByRole('button', { name: /^Delete$/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockNotifyError).toHaveBeenCalled();
    });
  });

  it('handles edit button with onMaterialEdited callback', async () => {
    fetchMock.mockResponseOnce(JSON.stringify(mockMaterial));
    const handleClose = jest.fn();
    const handleEdited = jest.fn();
    mockPush.mockClear();

    render(
      <MaterialDetailModal
        materialSlug="test-id-1"
        isOpen={true}
        onClose={handleClose}
        onMaterialEdited={handleEdited}
      />,
    );

    await waitFor(() => expect(screen.getByText(mockMaterial.title)).toBeInTheDocument());

    const editButton = screen.getByRole('button', { name: /Edit/i });
    fireEvent.click(editButton);

    // Should navigate to edit page
    expect(mockPush).toHaveBeenCalledWith(`/materials/${mockMaterial.slug}/edit`);
    expect(handleClose).toHaveBeenCalled();
    // And also call the callback
    expect(handleEdited).toHaveBeenCalledWith(mockMaterial.slug);
  });

  it('handles edit button without onMaterialEdited callback', async () => {
    fetchMock.mockResponseOnce(JSON.stringify(mockMaterial));
    mockPush.mockClear();

    render(<MaterialDetailModal materialSlug="test-id-1" isOpen={true} onClose={jest.fn()} />);

    await waitFor(() => expect(screen.getByText(mockMaterial.title)).toBeInTheDocument());

    const editButton = screen.getByRole('button', { name: /Edit/i });
    fireEvent.click(editButton);

    expect(mockPush).toHaveBeenCalledWith(`/materials/${mockMaterial.slug}/edit`);
  });

  it('renders loading state when fetching', async () => {
    // Mock a slow response
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: () => Promise.resolve(mockMaterial),
              } as Response),
            100,
          ),
        ),
    );

    render(<MaterialDetailModal materialSlug="test-id-1" isOpen={true} onClose={jest.fn()} />);

    // Should show loading state initially
    expect(screen.getByText('Loading Details...')).toBeInTheDocument();
    expect(screen.getByText('Fetching details...')).toBeInTheDocument();
  });

  it('renders empty state when no materialSlug provided', () => {
    render(<MaterialDetailModal materialSlug={null} isOpen={true} onClose={jest.fn()} />);

    expect(screen.getByText('Material Details')).toBeInTheDocument();
    expect(screen.getByText('Please select a material to view its details.')).toBeInTheDocument();
  });

  it('handles close modal and reset state', () => {
    const handleClose = jest.fn();

    render(<MaterialDetailModal materialSlug="test-id-1" isOpen={false} onClose={handleClose} />);

    // Modal should not be visible when isOpen is false
    expect(screen.queryByText('Material Details')).not.toBeInTheDocument();
  });

  it('handles material deletion', async () => {
    const mockOnMaterialDeleted = jest.fn();
    const mockOnClose = jest.fn();

    // Mock the initial material fetch
    fetchMock.mockResponseOnce(JSON.stringify(mockMaterial));

    render(
      <MaterialDetailModal
        materialSlug="test-slug-1"
        isOpen={true}
        onClose={mockOnClose}
        onMaterialDeleted={mockOnMaterialDeleted}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(mockMaterial.title)).toBeInTheDocument();
    });

    // Click delete button to open confirmation modal
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);

    // Wait for confirmation modal
    await waitFor(() => {
      const confirmButton = screen.getByRole('button', { name: /^Delete$/i });
      expect(confirmButton).toBeInTheDocument();
    });

    // Mock the delete request
    fetchMock.mockResponseOnce(JSON.stringify({ success: true }));

    // Confirm deletion
    const confirmButton = screen.getByRole('button', { name: /^Delete$/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockOnMaterialDeleted).toHaveBeenCalledWith('test-slug-1');
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('handles material editing', async () => {
    const mockOnMaterialEdited = jest.fn();
    const mockOnClose = jest.fn();

    fetchMock.mockResponseOnce(JSON.stringify(mockMaterial));

    render(
      <MaterialDetailModal
        materialSlug="test-slug-1"
        isOpen={true}
        onClose={mockOnClose}
        onMaterialEdited={mockOnMaterialEdited}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(mockMaterial.title)).toBeInTheDocument();
    });

    // Simulate material editing
    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(mockOnMaterialEdited).toHaveBeenCalledWith('test-slug-1');
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('handles audio playback controls', async () => {
    fetchMock.mockResponseOnce(JSON.stringify(mockMaterial));

    render(<MaterialDetailModal materialSlug="test-slug-1" isOpen={true} onClose={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(mockMaterial.title)).toBeInTheDocument();
    });

    // Check if audio player is rendered (mocked)
    expect(screen.getByTestId('mock-audio-player')).toBeInTheDocument();
  });

  it('formats date display correctly', async () => {
    fetchMock.mockResponseOnce(JSON.stringify(mockMaterial));

    render(<MaterialDetailModal materialSlug="test-slug-1" isOpen={true} onClose={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(mockMaterial.title)).toBeInTheDocument();
    });

    // Check if recorded date is properly formatted
    // toLocaleDateString() can return different formats based on locale
    // In CI (English locale), it's likely "1/15/2023"
    // Using a more flexible pattern to match both formats
    expect(screen.getByText(/(?:2023\/1\/15|1\/15\/2023)/)).toBeInTheDocument();
  });

  it('displays material metadata correctly', async () => {
    fetchMock.mockResponseOnce(JSON.stringify(mockMaterial));

    render(<MaterialDetailModal materialSlug="test-slug-1" isOpen={true} onClose={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(mockMaterial.title)).toBeInTheDocument();
    });

    // Check metadata display
    expect(screen.getByText('48000 Hz')).toBeInTheDocument();
    expect(screen.getByText('16-bit')).toBeInTheDocument();
    expect(screen.getByText('WAV')).toBeInTheDocument();
  });

  // ... (Rest of the original tests for MaterialDetailModal would be here)
});
