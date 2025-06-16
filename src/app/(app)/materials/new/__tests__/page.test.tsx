import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NewMaterialPage from '../page';

// next/navigation のモック
const mockRouterPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}));

// Server Actions のモック
const mockUploadAndAnalyzeAudio = jest.fn();
const mockCreateMaterialWithMetadata = jest.fn();
jest.mock('@/lib/actions/materials', () => ({
  uploadAndAnalyzeAudio: (...args: unknown[]) => mockUploadAndAnalyzeAudio(...args),
  createMaterialWithMetadata: (...args: unknown[]) => mockCreateMaterialWithMetadata(...args),
}));

// window.alert のモック
global.alert = jest.fn();

// useNotificationのモック
const mockNotifyError = jest.fn();
const mockNotifySuccess = jest.fn();
jest.mock('@/hooks/use-notification', () => ({
  useNotification: () => ({
    notifyError: mockNotifyError,
    notifySuccess: mockNotifySuccess,
  }),
}));

// StarRatingコンポーネントは実際のコンポーネントを使用（モックなし）

// EquipmentMultiSelectのモック
jest.mock('@/components/materials/EquipmentMultiSelect', () => ({
  EquipmentMultiSelect: ({
    selectedEquipmentIds,
    onChange,
  }: {
    selectedEquipmentIds: string[];
    onChange: (ids: string[]) => void;
  }) => {
    return (
      <div data-testid="equipment-multi-select">
        <button onClick={() => onChange(['equipment-1', 'equipment-2'])}>Select Equipment</button>
        <div>Selected: {selectedEquipmentIds.join(', ')}</div>
      </div>
    );
  },
}));

// StarRatingのモック
jest.mock('@/components/ui/star-rating', () => ({
  StarRating: ({
    value,
    onChange,
    id,
  }: {
    value: number;
    onChange: (value: number) => void;
    id?: string;
  }) => {
    return (
      <div data-testid="star-rating" id={id} role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            data-testid={`star-${rating}`}
            onClick={() => onChange(rating)}
            aria-label={`${rating} star${rating !== 1 ? 's' : ''}`}
            type="button"
            role="radio"
            aria-checked={rating <= value}
          >
            {rating <= value ? '★' : '☆'}
          </button>
        ))}
      </div>
    );
  },
}));

describe('NewMaterialPage', () => {
  beforeEach(() => {
    // 各テストの前にモックをリセット
    mockUploadAndAnalyzeAudio.mockClear();
    mockCreateMaterialWithMetadata.mockClear();
    mockRouterPush.mockClear(); // router.push のモックもクリア
    (global.alert as jest.Mock).mockClear(); // alert のモックもクリア
    mockNotifyError.mockClear();
    mockNotifySuccess.mockClear();
    // デフォルトの成功レスポンスは各テストケースで設定する
  });

  // HTML5フォームバリデーションをバイパスし、submitイベントを発生させるヘルパー
  const submitForm = async () => {
    const form = screen.getByTestId('new-material-form') as HTMLFormElement;
    const submitEvent = new Event('submit', {
      bubbles: true,
      cancelable: true,
    });
    fireEvent(form, submitEvent);
  };

  test('renders the form and handles input', async () => {
    // このテストでは fetch は呼ばれない想定なのでモック不要
    render(<NewMaterialPage />);

    // ページタイトルが表示されるか
    expect(screen.getByRole('heading', { name: /new material/i })).toBeInTheDocument();

    // タイトル入力フィールドが表示されるか
    const titleInput = screen.getByLabelText(/title/i);
    expect(titleInput).toBeInTheDocument();

    // ファイル選択フィールドが表示されるか (変更)
    const fileInput = screen.getByLabelText(/select audio file/i);
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveAttribute('type', 'file');

    // 録音日時入力フィールドが表示されるか
    expect(screen.getByLabelText(/recorded at/i)).toBeInTheDocument();

    // 機材選択フィールドが表示されるか
    expect(screen.getByTestId('equipment-multi-select')).toBeInTheDocument();

    // 保存ボタンが表示されるか
    expect(screen.getByRole('button', { name: /save material/i })).toBeInTheDocument();

    // タイトルを入力
    await userEvent.type(titleInput, 'Test Material Title');
    expect(titleInput).toHaveValue('Test Material Title');
  });

  test('uploads file and extracts metadata', async () => {
    // Server Action success response
    mockUploadAndAnalyzeAudio.mockResolvedValueOnce({
      success: true,
      tempFileId: 'test-temp-id',
      fileName: 'test.mp3',
      metadata: {
        fileFormat: 'MP3',
        sampleRate: 44100,
        bitDepth: null,
        durationSeconds: 180.5,
        channels: 2,
      },
    });

    render(<NewMaterialPage />);

    const fileInput = screen.getByLabelText(/select audio file/i) as HTMLInputElement;

    // ファイルを選択
    const testFile = new File(['test content'], 'test.mp3', { type: 'audio/mp3' });

    // ファイル選択をシミュレート
    Object.defineProperty(fileInput, 'files', {
      value: [testFile],
      writable: false,
    });

    // changeイベントを発火
    fireEvent.change(fileInput);

    // ファイル名が表示されるか確認
    await waitFor(() => {
      expect(screen.getByText('Selected file: test.mp3 (0.00 MB)')).toBeInTheDocument();
    });

    // 成功メッセージを確認（中間のメッセージはスキップしてもOK）
    await waitFor(
      () => {
        expect(screen.getByText('✓ File uploaded and analyzed successfully')).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    // メタデータが表示されるか確認
    await waitFor(() => {
      expect(screen.getByText('Technical Metadata (Auto-extracted)')).toBeInTheDocument();
    });
    expect(screen.getByText('MP3')).toBeInTheDocument();
    expect(screen.getByText('44,100 Hz')).toBeInTheDocument();
    expect(screen.getByText('N/A bit')).toBeInTheDocument();
    expect(screen.getByText('3:00')).toBeInTheDocument();
    expect(screen.getByText('Stereo')).toBeInTheDocument();
  });

  test('submits the form successfully with metadata', async () => {
    // Server Action success responses
    mockUploadAndAnalyzeAudio.mockResolvedValueOnce({
      success: true,
      tempFileId: 'test-temp-id',
      fileName: 'test.wav',
      metadata: {
        fileFormat: 'WAV',
        sampleRate: 48000,
        bitDepth: 24,
        durationSeconds: 120,
        channels: 1,
      },
    });

    mockCreateMaterialWithMetadata.mockResolvedValueOnce({
      success: true,
      data: { id: 'new-id', slug: 'new-slug' },
    });

    const user = userEvent.setup();
    render(<NewMaterialPage />);

    // フォーム要素を取得
    const titleInput = screen.getByLabelText(/title/i);
    const fileInput = screen.getByLabelText(/select audio file/i);
    const recordedAtInput = screen.getByLabelText(/recorded at/i);
    const tagsInput = screen.getByLabelText(/tags/i);

    // ファイルを選択（fireEventで統一）
    const testFile = new File(['(⌐□_□)'], 'test.wav', { type: 'audio/wav' });

    Object.defineProperty(fileInput, 'files', {
      value: [testFile],
      writable: false,
    });

    fireEvent.change(fileInput);

    // メタデータ抽出を待つ
    await waitFor(
      () => {
        expect(screen.getByText('✓ File uploaded and analyzed successfully')).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    // タイトルを入力
    await user.type(titleInput, 'Test Material');

    // 録音日時を入力
    await user.clear(recordedAtInput);
    await user.type(recordedAtInput, '2024-01-01T10:00');

    // タグを入力
    await user.type(tagsInput, 'tag1, tag2');

    // 評価を設定 (4つ星をクリック)
    const fourthStar = screen.getByTestId('star-4');
    await user.click(fourthStar);

    // 送信前の状態確認
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    // フォームを送信
    await submitForm();

    // Server Actionが呼ばれるまで待つ
    await waitFor(() => {
      expect(mockCreateMaterialWithMetadata).toHaveBeenCalledTimes(1);
    });

    // 正しいパラメータでServer Actionが呼ばれたか確認
    expect(mockCreateMaterialWithMetadata).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Test Material',
        tempFileId: 'test-temp-id',
        fileName: 'test.wav',
        tags: ['tag1', 'tag2'],
        rating: 4,
        metadata: {
          fileFormat: 'WAV',
          sampleRate: 48000,
          bitDepth: 24,
          durationSeconds: 120,
          channels: 1,
        },
      }),
    );

    // 成功時の処理を確認
    await waitFor(() => {
      expect(mockNotifySuccess).toHaveBeenCalledWith('create', 'material');
      expect(mockRouterPush).toHaveBeenCalledWith('/materials');
    });
  });

  test('handles API error on metadata extraction', async () => {
    // Server Action error response
    mockUploadAndAnalyzeAudio.mockResolvedValueOnce({
      success: false,
      error: 'Failed to extract metadata',
    });

    const user = userEvent.setup();
    render(<NewMaterialPage />);

    const fileInput = screen.getByLabelText(/select audio file/i);

    // ファイルを選択
    const testFile = new File(['error content'], 'error.wav', { type: 'audio/wav' });
    await user.upload(fileInput, testFile);

    // エラーメッセージを確認
    await waitFor(() => {
      expect(screen.getByText('✗ Failed to process file. Please try again.')).toBeInTheDocument();
    });

    // 保存ボタンが無効になっているか確認
    const saveButton = screen.getByRole('button', { name: /save material/i });
    expect(saveButton).toBeDisabled();
  });

  test('handles invalid date format for recordedAt', async () => {
    const user = userEvent.setup();
    render(<NewMaterialPage />);

    const titleInput = screen.getByLabelText(/title/i);
    const recordedAtInput = screen.getByLabelText(/recorded at/i) as HTMLInputElement;

    // Note: ファイルアップロードとメタデータ抽出をモック
    mockUploadAndAnalyzeAudio.mockResolvedValueOnce({
      success: true,
      tempFileId: 'test-temp-id',
      fileName: 'date.wav',
      metadata: {
        fileFormat: 'WAV',
        sampleRate: 48000,
        bitDepth: 24,
        durationSeconds: 120,
        channels: 2,
      },
    });

    // ファイルを選択
    const fileInput = screen.getByLabelText(/select audio file/i);
    const testFile = new File(['date content'], 'date.wav', { type: 'audio/wav' });
    await user.upload(fileInput, testFile);

    // メタデータ抽出を待つ
    await waitFor(() => {
      expect(screen.getByText('✓ File uploaded and analyzed successfully')).toBeInTheDocument();
    });

    // タイトルを入力
    await user.type(titleInput, 'Invalid Date Test');

    // recordedAtのvalueを直接セットして、Reactの状態と同期させる
    // 有効な日付を入力
    await user.clear(recordedAtInput);
    await user.type(recordedAtInput, '2024-01-01T10:00');

    // 不正な日付を設定（実際には空文字になるが、内部的に無効な日付として処理される）
    Object.defineProperty(recordedAtInput, 'value', {
      writable: true,
      value: 'invalid-date',
    });
    recordedAtInput.value = 'invalid-date';

    // React状態を更新するためのイベントを発火
    const changeEvent = new Event('change', { bubbles: true });
    fireEvent(recordedAtInput, changeEvent);

    // フォーム送信
    await submitForm();

    // エラーメッセージが表示されるか
    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent(/Invalid date format for Recorded At/i);
    });

    // Server Actionは呼ばれない（upload/analyze以外）
    expect(mockCreateMaterialWithMetadata).not.toHaveBeenCalled();
    expect(global.alert).not.toHaveBeenCalled();
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  test('submits all form fields', async () => {
    // Server Action success responses
    mockUploadAndAnalyzeAudio.mockResolvedValueOnce({
      success: true,
      tempFileId: 'test-temp-id',
      fileName: 'full_form.mp3',
      metadata: {
        fileFormat: 'MP3',
        sampleRate: 48000,
        bitDepth: null,
        durationSeconds: 240,
        channels: 2,
      },
    });

    mockCreateMaterialWithMetadata.mockResolvedValueOnce({
      success: true,
      data: { id: 'full-id', slug: 'full-slug' },
    });

    const user = userEvent.setup();
    render(<NewMaterialPage />);

    // ファイルを選択（fireEventで統一）
    const fileInput = screen.getByLabelText(/select audio file/i);
    const testFile = new File(['full content'], 'full_form.mp3', { type: 'audio/mp3' });

    Object.defineProperty(fileInput, 'files', {
      value: [testFile],
      writable: false,
    });

    fireEvent.change(fileInput);

    // メタデータ抽出を待つ
    await waitFor(
      () => {
        expect(screen.getByText('✓ File uploaded and analyzed successfully')).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    // すべてのフォームフィールドに入力
    await user.type(screen.getByLabelText(/title/i), 'Full Form Test');
    const recordedAtInputForFull = screen.getByLabelText(/recorded at/i);
    await user.clear(recordedAtInputForFull);
    await user.type(recordedAtInputForFull, '2023-03-15T14:30');
    // Technical Metadataフィールドは削除されたので、これらの入力は不要
    await user.type(screen.getByLabelText(/Latitude/i), '35.123');
    await user.type(screen.getByLabelText(/Longitude/i), '139.456');
    await user.type(screen.getByLabelText(/Location Name/i), 'Test Location');
    await user.type(screen.getByLabelText(/Tags/i), 'ambient, field recording, test');
    // 評価を設定 (5つ星をクリック)
    const fifthStar = screen.getByTestId('star-5');
    await user.click(fifthStar);
    await user.type(screen.getByTestId('memo-textarea'), 'This is a full test memo.');

    // 機材を選択
    await user.click(screen.getByText('Select Equipment'));
    // モックにより自動的にequipment-1とequipment-2が選択される
    await waitFor(() => {
      expect(screen.getByText('Selected: equipment-1, equipment-2')).toBeInTheDocument();
    });

    // フォーム送信
    await submitForm();

    // Server Actionが呼ばれるまで待つ
    await waitFor(() => {
      expect(mockCreateMaterialWithMetadata).toHaveBeenCalledTimes(1);
    });

    // 正しいパラメータでServer Actionが呼ばれたか確認
    expect(mockCreateMaterialWithMetadata).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Full Form Test',
        tempFileId: 'test-temp-id',
        fileName: 'full_form.mp3',
        memo: 'This is a full test memo.',
        tags: ['ambient', 'field recording', 'test'],
        equipmentIds: ['equipment-1', 'equipment-2'],
        latitude: 35.123,
        longitude: 139.456,
        locationName: 'Test Location',
        rating: 5,
        metadata: {
          fileFormat: 'MP3',
          sampleRate: 48000,
          bitDepth: null,
          durationSeconds: 240,
          channels: 2,
        },
      }),
    );

    // 成功時の処理を確認
    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/materials');
    });
  });

  test('displays error message when file is not selected', async () => {
    render(<NewMaterialPage />);

    // ファイル未選択の状態でフォームを送信
    await submitForm();

    // エラーメッセージが表示されるか
    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent(
        /Please select an audio file and wait for processing to complete/i,
      );
    });

    // fetchが呼ばれないことを確認
    expect(fetchMock).not.toHaveBeenCalled();
    expect(global.alert).not.toHaveBeenCalled();
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  test('handles duplicate title error (409)', async () => {
    // Server Action success response for upload
    mockUploadAndAnalyzeAudio.mockResolvedValueOnce({
      success: true,
      tempFileId: 'test-temp-id',
      fileName: 'duplicate.wav',
      metadata: {
        fileFormat: 'WAV',
        sampleRate: 48000,
        bitDepth: 24,
        durationSeconds: 120,
        channels: 1,
      },
    });

    // Server Action error response for create (duplicate title)
    mockCreateMaterialWithMetadata.mockResolvedValueOnce({
      success: false,
      error: 'そのタイトルの素材は既に存在しています',
    });

    const user = userEvent.setup();
    render(<NewMaterialPage />);

    // ファイルを選択
    const fileInput = screen.getByLabelText(/select audio file/i);
    const testFile = new File(['duplicate content'], 'duplicate.wav', { type: 'audio/wav' });

    Object.defineProperty(fileInput, 'files', {
      value: [testFile],
      writable: false,
    });

    fireEvent.change(fileInput);

    // メタデータ抽出を待つ
    await waitFor(
      () => {
        expect(screen.getByText('✓ File uploaded and analyzed successfully')).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    // フォームに入力
    await user.type(screen.getByLabelText(/title/i), 'Existing Material');
    const recordedAtInput = screen.getByLabelText(/recorded at/i);
    await user.clear(recordedAtInput);
    await user.type(recordedAtInput, '2024-01-01T10:00');

    // フォームを送信
    await submitForm();

    // Server Actionが呼ばれるまで待つ
    await waitFor(() => {
      expect(mockCreateMaterialWithMetadata).toHaveBeenCalledTimes(1);
    });

    // notifyErrorが正しいエラーメッセージで呼ばれることを確認
    await waitFor(() => {
      expect(mockNotifyError).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'そのタイトルの素材は既に存在しています',
          status: 409,
          message: 'そのタイトルの素材は既に存在しています',
        }),
        {
          operation: 'create',
          entity: 'material',
        },
      );
    });

    // ページ遷移が発生しないことを確認
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  describe('StarRating Integration', () => {
    test('displays StarRating component for rating input', async () => {
      render(<NewMaterialPage />);

      // StarRatingコンポーネントが表示されることを確認
      const starRating = screen.getByRole('radiogroup', { name: /rating/i });
      expect(starRating).toBeInTheDocument();

      // 星のボタンが5つ表示されることを確認
      const starButtons = screen.getAllByRole('radio');
      expect(starButtons).toHaveLength(5);

      // 初期状態では全ての星が空であることを確認
      starButtons.forEach((star) => {
        expect(star).toHaveTextContent('☆');
      });

      // aria-labelが正しく設定されていることを確認
      expect(screen.getByLabelText('1 star')).toBeInTheDocument();
      expect(screen.getByLabelText('2 stars')).toBeInTheDocument();
      expect(screen.getByLabelText('3 stars')).toBeInTheDocument();
      expect(screen.getByLabelText('4 stars')).toBeInTheDocument();
      expect(screen.getByLabelText('5 stars')).toBeInTheDocument();
    });

    test('allows rating selection via star clicks', async () => {
      const user = userEvent.setup();
      render(<NewMaterialPage />);

      // 初期状態：全ての星が空
      const starButtons = screen.getAllByRole('radio');
      starButtons.forEach((star) => {
        expect(star).toHaveTextContent('☆');
      });

      // 4つ星をクリック
      const fourthStar = screen.getByLabelText('4 stars');
      await user.click(fourthStar);

      // 評価が4に更新されることを確認（1-4は塗りつぶし、5は空）
      await waitFor(() => {
        expect(screen.getByLabelText('1 star')).toHaveTextContent('★');
        expect(screen.getByLabelText('2 stars')).toHaveTextContent('★');
        expect(screen.getByLabelText('3 stars')).toHaveTextContent('★');
        expect(screen.getByLabelText('4 stars')).toHaveTextContent('★');
        expect(screen.getByLabelText('5 stars')).toHaveTextContent('☆');
      });
    });

    test('includes rating value in form submission', async () => {
      // Server Action success responses
      mockUploadAndAnalyzeAudio.mockResolvedValueOnce({
        success: true,
        tempFileId: 'test-temp-id',
        fileName: 'test-rating.wav',
        metadata: {
          fileFormat: 'WAV',
          sampleRate: 44100,
          bitDepth: 16,
          durationSeconds: 60,
          channels: 2,
        },
      });

      mockCreateMaterialWithMetadata.mockResolvedValueOnce({
        success: true,
        slug: 'test-material-with-rating',
      });

      const user = userEvent.setup();
      render(<NewMaterialPage />);

      // ファイルアップロード
      const fileInput = screen.getByLabelText(/select audio file/i);
      const testFile = new File(['test content'], 'test-rating.wav', { type: 'audio/wav' });

      Object.defineProperty(fileInput, 'files', {
        value: [testFile],
        writable: false,
      });

      fireEvent.change(fileInput);

      // メタデータ抽出を待つ
      await waitFor(
        () => {
          expect(screen.getByText('✓ File uploaded and analyzed successfully')).toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      // フォームに入力
      await user.type(screen.getByLabelText(/title/i), 'Material with Rating');
      const recordedAtInput = screen.getByLabelText(/recorded at/i);
      await user.clear(recordedAtInput);
      await user.type(recordedAtInput, '2024-01-01T10:00');

      // 5つ星評価を設定
      const fifthStar = screen.getByLabelText('5 stars');
      await user.click(fifthStar);

      // 評価が5に設定されることを確認
      await waitFor(() => {
        expect(screen.getByLabelText('1 star')).toHaveTextContent('★');
        expect(screen.getByLabelText('2 stars')).toHaveTextContent('★');
        expect(screen.getByLabelText('3 stars')).toHaveTextContent('★');
        expect(screen.getByLabelText('4 stars')).toHaveTextContent('★');
        expect(screen.getByLabelText('5 stars')).toHaveTextContent('★');
      });

      // フォームを送信
      await submitForm();

      // Server Actionが正しい引数で呼ばれることを確認
      await waitFor(() => {
        expect(mockCreateMaterialWithMetadata).toHaveBeenCalledWith(
          expect.objectContaining({
            rating: 5, // rating値が含まれる
          }),
        );
      });
    });

    test('handles rating value of 0 (no rating) in form submission', async () => {
      // Server Action success responses
      mockUploadAndAnalyzeAudio.mockResolvedValueOnce({
        success: true,
        tempFileId: 'test-temp-id',
        fileName: 'test-no-rating.wav',
        metadata: {
          fileFormat: 'WAV',
          sampleRate: 44100,
          bitDepth: 16,
          durationSeconds: 60,
          channels: 2,
        },
      });

      mockCreateMaterialWithMetadata.mockResolvedValueOnce({
        success: true,
        slug: 'test-material-no-rating',
      });

      const user = userEvent.setup();
      render(<NewMaterialPage />);

      // ファイルアップロード
      const fileInput = screen.getByLabelText(/select audio file/i);
      const testFile = new File(['test content'], 'test-no-rating.wav', { type: 'audio/wav' });

      Object.defineProperty(fileInput, 'files', {
        value: [testFile],
        writable: false,
      });

      fireEvent.change(fileInput);

      // メタデータ抽出を待つ
      await waitFor(
        () => {
          expect(screen.getByText('✓ File uploaded and analyzed successfully')).toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      // フォームに入力（ratingは初期値の0のまま）
      await user.type(screen.getByLabelText(/title/i), 'Material with No Rating');
      const recordedAtInput = screen.getByLabelText(/recorded at/i);
      await user.clear(recordedAtInput);
      await user.type(recordedAtInput, '2024-01-01T10:00');

      // 評価は0のまま（何もクリックしない） - 全ての星が空
      const starButtons = screen.getAllByRole('radio');
      starButtons.forEach((star) => {
        expect(star).toHaveTextContent('☆');
      });

      // フォームを送信
      await submitForm();

      // Server Actionが正しい引数で呼ばれることを確認
      await waitFor(() => {
        expect(mockCreateMaterialWithMetadata).toHaveBeenCalledWith(
          expect.objectContaining({
            rating: null, // rating値が0の場合はnullとして送信される
          }),
        );
      });
    });
  });
});
