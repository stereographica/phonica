import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PhotoLocationExtractor from '../PhotoLocationExtractor';

// Mock exifr library
const mockGps = jest.fn();
jest.mock('exifr', () => ({
  gps: (...args: unknown[]) => mockGps(...args),
}));

// Mock FileReader
const mockFileReader = {
  readAsDataURL: jest.fn(),
  result: 'data:image/jpeg;base64,mock',
  onload: null as ((event: ProgressEvent<FileReader>) => void) | null,
};

const MockFileReader = jest.fn().mockImplementation(() => mockFileReader);
(global as typeof globalThis & { FileReader: typeof FileReader }).FileReader =
  MockFileReader as unknown as typeof FileReader;

describe('PhotoLocationExtractor', () => {
  const mockProps = {
    isOpen: true,
    onClose: jest.fn(),
    onLocationExtracted: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGps.mockReset();
    mockFileReader.readAsDataURL.mockClear();
    mockFileReader.onload = null;
  });

  it('renders dialog when open', () => {
    render(<PhotoLocationExtractor {...mockProps} />);

    expect(screen.getByText('Extract Location from Photo')).toBeInTheDocument();
    expect(screen.getByText('Drag and drop a photo here, or click to select')).toBeInTheDocument();
    expect(screen.getByText('Supports JPEG, PNG with GPS metadata')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<PhotoLocationExtractor {...mockProps} isOpen={false} />);

    expect(screen.queryByText('Extract Location from Photo')).not.toBeInTheDocument();
  });

  it('handles file selection with GPS data', async () => {
    const user = userEvent.setup();
    mockGps.mockResolvedValue({ latitude: 35.681236, longitude: 139.767125 });

    render(<PhotoLocationExtractor {...mockProps} />);

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText('Upload photo with GPS data');

    await user.upload(input, file);

    // Simulate FileReader onload with proper event
    await act(async () => {
      if (mockFileReader.onload) {
        const event = { target: { result: 'data:image/jpeg;base64,test' } };
        mockFileReader.onload(event as unknown as ProgressEvent<FileReader>);
      }
    });

    await waitFor(() => {
      expect(mockGps).toHaveBeenCalledWith(file);
      expect(screen.getByText('test.jpg')).toBeInTheDocument();
      expect(screen.getByText('Location found: 35.681236, 139.767125')).toBeInTheDocument();
    });
  });

  it('handles file selection without GPS data', async () => {
    const user = userEvent.setup();
    mockGps.mockResolvedValue(null);

    render(<PhotoLocationExtractor {...mockProps} />);

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText('Upload photo with GPS data');

    await user.upload(input, file);

    // Simulate FileReader onload with proper event
    await act(async () => {
      if (mockFileReader.onload) {
        const event = { target: { result: 'data:image/jpeg;base64,test' } };
        mockFileReader.onload(event as unknown as ProgressEvent<FileReader>);
      }
    });

    await waitFor(() => {
      expect(
        screen.getByText('No GPS information found in this image. Please try another photo.'),
      ).toBeInTheDocument();
    });
  });

  it('handles non-image file selection', async () => {
    render(<PhotoLocationExtractor {...mockProps} />);

    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    const input = screen.getByLabelText('Upload photo with GPS data') as HTMLInputElement;

    // Manually set the files property and trigger change event
    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });

    await act(async () => {
      fireEvent.change(input);
    });

    // Wait for error message to appear
    await waitFor(
      () => {
        expect(
          screen.getByText('Please select an image file (JPEG, PNG, etc.)'),
        ).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    // Verify that the file was not processed
    expect(mockGps).not.toHaveBeenCalled();
    expect(mockFileReader.readAsDataURL).not.toHaveBeenCalled();
  });

  it('handles drag and drop', async () => {
    mockGps.mockResolvedValue({ latitude: 35.681236, longitude: 139.767125 });
    render(<PhotoLocationExtractor {...mockProps} />);

    const dropZone = screen.getByText(
      'Drag and drop a photo here, or click to select',
    ).parentElement!;
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

    // Simulate drag over
    fireEvent.dragOver(dropZone, {
      dataTransfer: {
        files: [file],
      },
    });

    // Simulate drop
    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [file],
      },
    });

    // Simulate FileReader onload with proper event
    await act(async () => {
      if (mockFileReader.onload) {
        const event = { target: { result: 'data:image/jpeg;base64,test' } };
        mockFileReader.onload(event as unknown as ProgressEvent<FileReader>);
      }
    });

    await waitFor(() => {
      expect(mockGps).toHaveBeenCalledWith(file);
      expect(screen.getByText('test.jpg')).toBeInTheDocument();
    });
  });

  it('calls onLocationExtracted when Use This Location is clicked', async () => {
    const user = userEvent.setup();
    mockGps.mockResolvedValue({ latitude: 35.681236, longitude: 139.767125 });

    render(<PhotoLocationExtractor {...mockProps} />);

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText('Upload photo with GPS data');

    await user.upload(input, file);

    // Simulate FileReader onload with proper event
    await act(async () => {
      if (mockFileReader.onload) {
        const event = { target: { result: 'data:image/jpeg;base64,test' } };
        mockFileReader.onload(event as unknown as ProgressEvent<FileReader>);
      }
    });

    await waitFor(() => {
      expect(screen.getByText('Location found: 35.681236, 139.767125')).toBeInTheDocument();
    });

    const useButton = screen.getByText('Use This Location');
    await user.click(useButton);

    expect(mockProps.onLocationExtracted).toHaveBeenCalledWith(35.681236, 139.767125);
  });

  it('disables Use This Location button when no location is extracted', () => {
    render(<PhotoLocationExtractor {...mockProps} />);

    const useButton = screen.getByText('Use This Location');
    expect(useButton).toBeDisabled();
  });

  it('handles exifr errors gracefully', async () => {
    const user = userEvent.setup();
    mockGps.mockRejectedValue(new Error('Failed to parse EXIF'));

    render(<PhotoLocationExtractor {...mockProps} />);

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText('Upload photo with GPS data');

    await user.upload(input, file);

    // Simulate FileReader onload with proper event
    await act(async () => {
      if (mockFileReader.onload) {
        const event = { target: { result: 'data:image/jpeg;base64,test' } };
        mockFileReader.onload(event as unknown as ProgressEvent<FileReader>);
      }
    });

    await waitFor(() => {
      expect(
        screen.getByText('Failed to read image metadata. Please try another photo.'),
      ).toBeInTheDocument();
    });
  });

  it('resets state when file is removed', async () => {
    const user = userEvent.setup();
    mockGps.mockResolvedValue({ latitude: 35.681236, longitude: 139.767125 });

    render(<PhotoLocationExtractor {...mockProps} />);

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText('Upload photo with GPS data');

    await user.upload(input, file);

    // Simulate FileReader onload with proper event
    await act(async () => {
      if (mockFileReader.onload) {
        const event = { target: { result: 'data:image/jpeg;base64,test' } };
        mockFileReader.onload(event as unknown as ProgressEvent<FileReader>);
      }
    });

    await waitFor(() => {
      expect(screen.getByText('test.jpg')).toBeInTheDocument();
    });

    // Click the X button to remove the file
    const removeButton = screen.getByRole('button', { name: '' }); // X button has no text
    await user.click(removeButton);

    expect(screen.getByText('Drag and drop a photo here, or click to select')).toBeInTheDocument();
    expect(screen.queryByText('test.jpg')).not.toBeInTheDocument();
  });

  it('closes dialog when Cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<PhotoLocationExtractor {...mockProps} />);

    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('shows processing indicator while extracting GPS', async () => {
    const user = userEvent.setup();

    // Mock a slow GPS extraction
    mockGps.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ latitude: 35.681236, longitude: 139.767125 }), 100),
        ),
    );

    render(<PhotoLocationExtractor {...mockProps} />);

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText('Upload photo with GPS data');

    await user.upload(input, file);

    // Simulate FileReader onload with proper event
    await act(async () => {
      if (mockFileReader.onload) {
        const event = { target: { result: 'data:image/jpeg;base64,test' } };
        mockFileReader.onload(event as unknown as ProgressEvent<FileReader>);
      }
    });

    expect(screen.getByText('Extracting GPS information...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText('Extracting GPS information...')).not.toBeInTheDocument();
      expect(screen.getByText('Location found: 35.681236, 139.767125')).toBeInTheDocument();
    });
  });
});
