import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NewMaterialPage from '../page';

// next/navigation のモック
const mockRouterPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}));

// fetch API のモック
global.fetch = jest.fn();

// window.alert のモック
global.alert = jest.fn();

describe('NewMaterialPage', () => {
  beforeEach(() => {
    // 各テストの前にモックをリセット
    jest.clearAllMocks();
    // デフォルトの成功レスポンスをモックしておく
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
  });

  test('renders the form and handles input', () => {
    render(<NewMaterialPage />);

    // ページタイトルが表示されるか
    expect(screen.getByRole('heading', { name: /new material/i })).toBeInTheDocument();

    // タイトル入力フィールドが表示されるか
    const titleInput = screen.getByLabelText(/title/i);
    expect(titleInput).toBeInTheDocument();

    // ファイルパス入力フィールドが表示されるか
    expect(screen.getByLabelText(/file path/i)).toBeInTheDocument();
    
    // 録音日時入力フィールドが表示されるか
    expect(screen.getByLabelText(/recorded at/i)).toBeInTheDocument();

    // 保存ボタンが表示されるか
    expect(screen.getByRole('button', { name: /save material/i })).toBeInTheDocument();

    // タイトルを入力
    fireEvent.change(titleInput, { target: { value: 'Test Material Title' } });
    expect(titleInput).toHaveValue('Test Material Title');
  });

  test('submits the form successfully', async () => {
    render(<NewMaterialPage />);

    const titleInput = screen.getByLabelText(/title/i);
    const filePathInput = screen.getByLabelText(/file path/i);
    const recordedAtInput = screen.getByLabelText(/recorded at/i);
    const tagsInput = screen.getByLabelText(/tags/i);
    const saveButton = screen.getByRole('button', { name: /save material/i });

    // フォームに入力
    await userEvent.type(titleInput, 'Test Material');
    await userEvent.type(filePathInput, '/test/path.wav');
    // datetime-local のフォーマットに合わせる
    fireEvent.change(recordedAtInput, { target: { value: '2024-01-01T10:00' } });
    await userEvent.type(tagsInput, 'tag1, tag2');

    // 送信ボタンをクリック
    await userEvent.click(saveButton);

    // fetch が正しいデータで呼び出されるか
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/materials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Test Material',
          filePath: '/test/path.wav',
          recordedAt: new Date('2024-01-01T10:00').toISOString(), // ISOStringに変換されることを期待
          memo: '',
          tags: ['tag1', 'tag2'],
          fileFormat: null,
          sampleRate: null,
          bitDepth: null,
          latitude: null,
          longitude: null,
          locationName: null,
          rating: null,
        }),
      });
    });

    // アラートが表示されるか
    expect(global.alert).toHaveBeenCalledWith('Material saved successfully!');

    // /materials にリダイレクトされるか
    expect(mockRouterPush).toHaveBeenCalledWith('/materials');
  });

  test('handles API error on submit', async () => {
    // fetch がエラーを返すようにモック
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Test API Error' }),
      status: 500,
    });

    render(<NewMaterialPage />);

    const titleInput = screen.getByLabelText(/title/i);
    const filePathInput = screen.getByLabelText(/file path/i);
    const recordedAtInput = screen.getByLabelText(/recorded at/i);
    const saveButton = screen.getByRole('button', { name: /save material/i });

    await userEvent.type(titleInput, 'Error Test');
    await userEvent.type(filePathInput, '/error/path.wav');
    fireEvent.change(recordedAtInput, { target: { value: '2024-01-02T12:00' } });
    
    await userEvent.click(saveButton);

    // エラーメッセージが表示されるか
    await waitFor(() => {
      expect(within(screen.getByRole('alert')).getByText(/Test API Error/i)).toBeInTheDocument();
    });

    // アラートは表示されない
    expect(global.alert).not.toHaveBeenCalled();
    // リダイレクトされない
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  test.skip('handles invalid date format for recordedAt', async () => {
    render(<NewMaterialPage />);    
    const titleInput = screen.getByLabelText(/title/i);
    const filePathInput = screen.getByLabelText(/file path/i);
    const recordedAtInput = screen.getByLabelText(/recorded at/i);
    const saveButton = screen.getByRole('button', { name: /save material/i });

    await userEvent.type(titleInput, 'Invalid Date Test');
    await userEvent.type(filePathInput, '/date/test.wav');
    fireEvent.change(recordedAtInput, { target: { value: 'invalid-date' } });

    await userEvent.click(saveButton);
    
    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent(/Invalid date format for Recorded At./i);
    }, { timeout: 2000 });
        
    expect(fetch).not.toHaveBeenCalled();
    expect(global.alert).not.toHaveBeenCalled();
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  test('submits all form fields', async () => {
    render(<NewMaterialPage />);

    await userEvent.type(screen.getByLabelText(/title/i), 'Full Form Test');
    await userEvent.type(screen.getByLabelText(/file path/i), '/full/form.wav');
    fireEvent.change(screen.getByLabelText(/recorded at/i), { target: { value: '2023-03-15T14:30' } });
    await userEvent.type(screen.getByLabelText(/File Format/i), 'WAV');
    await userEvent.type(screen.getByLabelText(/Sample Rate \(Hz\)/i), '48000');
    await userEvent.type(screen.getByLabelText(/Bit Depth/i), '24');
    await userEvent.type(screen.getByLabelText(/Latitude/i), '35.123');
    await userEvent.type(screen.getByLabelText(/Longitude/i), '139.456');
    await userEvent.type(screen.getByLabelText(/Location Name/i), 'Test Location');
    await userEvent.type(screen.getByLabelText(/Tags/i), 'ambient, field recording, test');
    await userEvent.type(screen.getByLabelText(/Rating/i), '5');
    await userEvent.type(screen.getByTestId('memo-textarea'), 'This is a full test memo.');

    await userEvent.click(screen.getByRole('button', { name: /save material/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Full Form Test',
          filePath: '/full/form.wav',
          recordedAt: new Date('2023-03-15T14:30').toISOString(),
          memo: 'This is a full test memo.',
          tags: ['ambient', 'field recording', 'test'],
          fileFormat: 'WAV',
          sampleRate: 48000,
          bitDepth: 24,
          latitude: 35.123,
          longitude: 139.456,
          locationName: 'Test Location',
          rating: 5,
        }),
      });
    });

    expect(global.alert).toHaveBeenCalledWith('Material saved successfully!');
    expect(mockRouterPush).toHaveBeenCalledWith('/materials');
  });

  test('displays error message when required fields are missing', async () => {
    // fetch がエラーを返すようにモック (バリデーションエラーを想定)
    (fetch as jest.Mock).mockReset(); // モックをリセット
    (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Title and filePath are required' }),
        status: 400,
    });

    render(<NewMaterialPage />);

    // form要素を取得し、noValidate を true に設定してHTML5バリデーションを無効化
    const form = screen.getByTestId("new-material-form") as HTMLFormElement;
    form.noValidate = true;

    // Recorded At のみ入力 (他の必須フィールドは空)
    fireEvent.change(screen.getByLabelText(/recorded at/i), { target: { value: '2023-03-15T14:30' } });
    
    await userEvent.click(screen.getByRole('button', { name: /save material/i }));

    // fetch が呼び出されたか確認
    await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    // HTML5 の required 属性によるネイティブなバリデーションは JSDOM では完全には動作しないため、
    // ここでは API からのバリデーションエラーをシミュレートする
    await waitFor(async () => {
        const alert = await screen.findByRole('alert');
        expect(alert).toHaveTextContent(/Title and filePath are required/i);
    }, {timeout: 3000});

    expect(global.alert).not.toHaveBeenCalled();
    expect(mockRouterPush).not.toHaveBeenCalled();
  });
}); 
