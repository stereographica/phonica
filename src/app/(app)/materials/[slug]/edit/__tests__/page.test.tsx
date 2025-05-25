/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EditMaterialPage from '../page';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useParams, useRouter } from 'next/navigation';
import '../../../../../../global.mock'; // fetch, alert, FormData などのグローバルモック

// next/navigation のモック
const mockRouterPush = jest.fn();
const mockRouterBack = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    back: mockRouterBack,
  }),
  useParams: () => ({ slug: 'test-slug' }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
}));

// FormData の append のモックを取得 (global.mock.ts で定義されている想定)
// eslint-disable-next-line no-var
declare var mockAppend: jest.Mock; 

const mockMaterialData = {
  id: '1',
  slug: 'test-slug',
  title: 'Original Title',
  filePath: 'original-file.wav',
  fileFormat: 'WAV',
  sampleRate: 48000,
  bitDepth: 24,
  recordedDate: '2023-10-26T10:00:00.000Z',
  durationSeconds: 120,
  latitude: 35.681236,
  longitude: 139.767125,
  memo: 'Original memo',
  tags: [{ id: '1', name: 'nature' }, { id: '2', name: 'park' }],
  equipments: [{ id: '1', name: 'Recorder A' }],
  rating: 4,
  locationName: 'Test Location',
  userId: 'user-123',
  createdAt: '2023-10-26T10:00:00.000Z',
  updatedAt: '2023-10-26T10:00:00.000Z',
};

let user: ReturnType<typeof userEvent.setup>;

beforeEach(() => {
  user = userEvent.setup();
  fetchMock.resetMocks();
  mockRouterPush.mockClear();
  mockRouterBack.mockClear();
  if (typeof mockAppend !== 'undefined') mockAppend.mockClear(); 
  (global.alert as jest.Mock).mockClear();
  fetchMock.mockResponseOnce(JSON.stringify(mockMaterialData));
});

describe('EditMaterialPage', () => {
  it('renders loading state initially and then the form with fetched data', async () => {
    await act(async () => {
      render(<EditMaterialPage />);
    });
    expect(screen.getByText(/loading material data.../i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText(/loading material data.../i)).not.toBeInTheDocument();
    });
    expect(screen.getByLabelText(/title/i)).toHaveValue(mockMaterialData.title);
    const recordedAtInput = screen.getByLabelText(/recorded at/i) as HTMLInputElement;
    const expectedDate = new Date(mockMaterialData.recordedDate);
    const localYear = expectedDate.getFullYear();
    const localMonth = (expectedDate.getMonth() + 1).toString().padStart(2, '0');
    const localDay = expectedDate.getDate().toString().padStart(2, '0');
    const localHours = expectedDate.getHours().toString().padStart(2, '0');
    const localMinutes = expectedDate.getMinutes().toString().padStart(2, '0');
    const expectedLocalValue = `${localYear}-${localMonth}-${localDay}T${localHours}:${localMinutes}`;
    expect(recordedAtInput.value).toBe(expectedLocalValue);
    expect(screen.getByLabelText(/file format/i)).toHaveValue(mockMaterialData.fileFormat);
    expect(screen.getByLabelText(/sample rate/i)).toHaveValue(mockMaterialData.sampleRate.toString());
    expect(screen.getByLabelText(/bit depth/i)).toHaveValue(mockMaterialData.bitDepth.toString());
    expect(screen.getByLabelText(/latitude/i)).toHaveValue(mockMaterialData.latitude.toString());
    expect(screen.getByLabelText(/longitude/i)).toHaveValue(mockMaterialData.longitude.toString());
    expect(screen.getByLabelText(/location name/i)).toHaveValue(mockMaterialData.locationName);
    expect(screen.getByLabelText(/tags/i)).toHaveValue(mockMaterialData.tags.map(t => t.name).join(', '));
    expect(screen.getByLabelText(/equipment/i)).toHaveValue(mockMaterialData.equipments.map(e => e.name).join(', '));
    expect(screen.getByLabelText(/memo/i)).toHaveValue(mockMaterialData.memo);
    expect(screen.getByLabelText(/rating/i)).toHaveValue(mockMaterialData.rating.toString());
    expect(screen.getByText(`Current file: ${mockMaterialData.filePath}`)).toBeInTheDocument();
  });

  it('updates input fields correctly', async () => {
    await act(async () => {
      render(<EditMaterialPage />);
    });
    await waitFor(() => expect(screen.queryByText(/loading material data.../i)).not.toBeInTheDocument());
    const titleInput = screen.getByLabelText(/title/i);
    await act(async () => {
      await user.clear(titleInput);
      await user.type(titleInput, 'New Test Title');
    });
    expect(titleInput).toHaveValue('New Test Title');
    const memoInput = screen.getByLabelText(/memo/i);
    await act(async () => {
      await user.clear(memoInput);
      await user.type(memoInput, 'New memo content.');
    });
    expect(memoInput).toHaveValue('New memo content.');
  });

  it('submits the form with updated data (no new file)', async () => {
    await act(async () => {
      render(<EditMaterialPage />);
    });
    await waitFor(() => expect(screen.queryByText(/loading material data.../i)).not.toBeInTheDocument());
    const titleInput = screen.getByLabelText(/title/i);
    await act(async () => {
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Title via Test');
    });
    const recordedAtInput = screen.getByLabelText(/recorded at/i) as HTMLInputElement;
    const newRecordedAt = '2024-01-01T12:00';
    await act(async () => {
      fireEvent.change(recordedAtInput, { target: { value: newRecordedAt } });
    });
    fetchMock.mockResponseOnce(JSON.stringify({ material: { ...mockMaterialData, title: 'Updated Title via Test' } }), { status: 200 });
    const saveButton = screen.getByRole('button', { name: /update material/i });
    await act(async () => {
      await user.click(saveButton);
    });
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2); 
    });
    if (typeof mockAppend !== 'undefined') {
        expect(mockAppend).toHaveBeenCalledWith('title', 'Updated Title via Test');
        expect(mockAppend).toHaveBeenCalledWith('recordedAt', new Date(newRecordedAt).toISOString());
    }
    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Material updated successfully!');
    });
    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/materials/test-slug');
    });
  });

  it('submits the form with a new file', async () => {
    await act(async () => {
      render(<EditMaterialPage />);
    });
    await waitFor(() => expect(screen.queryByText(/loading material data.../i)).not.toBeInTheDocument());
    const file = new File(['dummy content'], 'new-audio.mp3', { type: 'audio/mpeg' });
    const fileInput = screen.getByLabelText(/select new audio file/i);
    await act(async () => {
      await user.upload(fileInput, file);
    });
    fetchMock.mockResponseOnce(JSON.stringify({ material: { ...mockMaterialData, filePath: 'new-audio.mp3' } }), { status: 200 });
    const saveButton = screen.getByRole('button', { name: /update material/i });
    await act(async () => {
      await user.click(saveButton);
    });
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
    if (typeof mockAppend !== 'undefined') {
        expect(mockAppend).toHaveBeenCalledWith('audioFile', file);
    }
    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Material updated successfully!');
    });
    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/materials/test-slug');
    });
  });

  it('handles fetch error when loading initial data', async () => {
    fetchMock.resetMocks(); 
    fetchMock.mockRejectOnce(new Error('Network Error'));
    await act(async () => {
      render(<EditMaterialPage />);
    });
    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent(/Network Error/i);
    });
  });

  test.skip('shows error if title is empty on submit', async () => {
    await act(async () => {
      render(<EditMaterialPage />);
    });
    await waitFor(() => expect(screen.queryByText(/loading material data.../i)).not.toBeInTheDocument());
    const titleInput = screen.getByLabelText(/title/i) as HTMLInputElement;
    await act(async () => {
      await user.clear(titleInput);
    });
    const saveButton = screen.getByRole('button', { name: /update material/i });
    await act(async () => {
      await user.click(saveButton);
    });
    
    await waitFor(() => {
      const alertTitle = screen.getByTestId('error-message');
      expect(alertTitle).toBeInTheDocument();
      expect(alertTitle).toHaveTextContent(/Title is required/i);
    }, { timeout: 7000 });

    expect(global.fetch).toHaveBeenCalledTimes(1); // Initial fetch only
    expect(global.alert).not.toHaveBeenCalled();
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  test.skip('shows error if recordedAt is empty on submit', async () => {
    await act(async () => {
      render(<EditMaterialPage />);
    });
    await waitFor(() => expect(screen.queryByText(/loading material data.../i)).not.toBeInTheDocument());
    const recordedAtInput = screen.getByLabelText(/recorded at/i) as HTMLInputElement;
    await act(async () => {
      await user.clear(recordedAtInput);
    });
    const saveButton = screen.getByRole('button', { name: /update material/i });
    await act(async () => {
      await user.click(saveButton);
    });

    await waitFor(() => {
      const alertRecordedAt = screen.getByTestId('error-message');
      expect(alertRecordedAt).toBeInTheDocument();
      expect(alertRecordedAt).toHaveTextContent(/Recorded At is required/i);
    }, { timeout: 7000 });
    
    expect(global.fetch).toHaveBeenCalledTimes(1); // Initial fetch only
    expect(global.alert).not.toHaveBeenCalled();
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  test.skip('shows API error if submission fails', async () => {
    await act(async () => {
      render(<EditMaterialPage />);
    });
    await waitFor(() => expect(screen.queryByText(/loading material data.../i)).not.toBeInTheDocument());
    fetchMock.mockResponseOnce(JSON.stringify({ error: 'Failed to Update' }), { status: 500 });
    const saveButton = screen.getByRole('button', { name: /update material/i });
    await act(async () => {
      await user.click(saveButton);
    });

    await waitFor(() => {
      const alertApiError = screen.getByTestId('error-message');
      expect(alertApiError).toBeInTheDocument();
      expect(alertApiError).toHaveTextContent(/Failed to Update/i);
    }, { timeout: 7000 });

    expect(global.alert).not.toHaveBeenCalled();
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it.skip('submits the form with correctly formatted recordedAt', async () => {
    await act(async () => {
      render(<EditMaterialPage />);
    });
    await waitFor(() => expect(screen.queryByText(/loading material data.../i)).not.toBeInTheDocument());
    const recordedAtInput = screen.getByLabelText(/recorded at/i) as HTMLInputElement;
    const inputValue = '2023-11-15T14:30';
    await act(async () => {
      fireEvent.change(recordedAtInput, { target: { value: inputValue } });
    });
    expect(recordedAtInput.value).toBe(inputValue);
    fetchMock.mockResponseOnce(JSON.stringify({ material: mockMaterialData }), { status: 200 });
    const saveButton = screen.getByRole('button', { name: /update material/i });
    await act(async () => {
      await user.click(saveButton);
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const expectedSubmittedDate = new Date(inputValue).toISOString();
    if (typeof mockAppend !== 'undefined') {
        expect(mockAppend).toHaveBeenCalledWith('recordedAt', expectedSubmittedDate);
    }
    // const requestBody = (fetchMock.mock.calls[1][1]?.body as FormData); // 未使用のためコメントアウト
  });

  it('navigates back when back button is clicked', async () => {
    await act(async () => {
      render(<EditMaterialPage />);
    });
    await waitFor(() => expect(screen.queryByText(/loading material data.../i)).not.toBeInTheDocument());
    const backButton = screen.getByRole('button', { name: /back to materials/i });
    await act(async () => {
      await user.click(backButton);
    });
    expect(mockRouterBack).toHaveBeenCalledTimes(1);
  });
});
