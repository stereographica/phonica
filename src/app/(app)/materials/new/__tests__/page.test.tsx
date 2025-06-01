import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NewMaterialPage from '../page';
import fetchMock from 'jest-fetch-mock'; // jest-fetch-mock をインポート

fetchMock.enableMocks(); // jest-fetch-mock を有効化

// next/navigation のモック
const mockRouterPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}));

// fetch API のモック は jest-fetch-mock が行うので削除
// global.fetch = jest.fn();

// window.alert のモック
global.alert = jest.fn();

describe('NewMaterialPage', () => {
  beforeEach(() => {
    // 各テストの前にモックをリセット
    fetchMock.resetMocks(); // jest-fetch-mock のリセットメソッドを使用
    mockRouterPush.mockClear(); // router.push のモックもクリア
    (global.alert as jest.Mock).mockClear(); // alert のモックもクリア
    // デフォルトの成功レスポンスは各テストケースで設定する
  });

  // HTML5フォームバリデーションをバイパスし、submitイベントを発生させるヘルパー
  const submitForm = async () => {
    const form = screen.getByTestId('new-material-form') as HTMLFormElement;
    const submitEvent = new Event('submit', { 
      bubbles: true, 
      cancelable: true 
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

    // 保存ボタンが表示されるか
    expect(screen.getByRole('button', { name: /save material/i })).toBeInTheDocument();

    // タイトルを入力
    await userEvent.type(titleInput, 'Test Material Title');
    expect(titleInput).toHaveValue('Test Material Title');

    // ファイルを選択 (追加)
    const testFile = new File(['test content'], 'test.mp3', { type: 'audio/mp3' });
    await userEvent.upload(fileInput, testFile);
    // ファイル名が表示されるか確認 (オプション)
    expect(screen.getByText('Selected file: test.mp3 (0.00 MB)')).toBeInTheDocument();
  });

  test('submits the form successfully', async () => {
    // API成功時のレスポンスをモック
    fetchMock.mockResponseOnce(JSON.stringify({ id: 'new-id', slug: 'new-slug' }), { status: 201 });

    const user = userEvent.setup();
    render(<NewMaterialPage />);

    // フォーム要素を取得
    const titleInput = screen.getByLabelText(/title/i);
    const fileInput = screen.getByLabelText(/select audio file/i);
    const recordedAtInput = screen.getByLabelText(/recorded at/i);
    const tagsInput = screen.getByLabelText(/tags/i);

    // ファイルを選択
    const testFile = new File(['(⌐□_□)'], 'chucknorris.wav', { type: 'audio/wav' });
    await user.upload(fileInput, testFile);

    // タイトルを入力
    await user.type(titleInput, 'Test Material');
    
    // 録音日時を入力
    await user.clear(recordedAtInput);
    await user.type(recordedAtInput, '2024-01-01T10:00');
    
    // タグを入力
    await user.type(tagsInput, 'tag1, tag2');

    // 送信前の状態確認
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    // フォームを送信
    await submitForm();

    // APIが呼ばれるまで待つ
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    // 正しいパラメータでAPIが呼ばれたか確認
    expect(fetchMock).toHaveBeenCalledWith('/api/materials', {
      method: 'POST',
      body: expect.objectContaining({
        append: expect.any(Function),
      }),
    });

    // 成功時の処理を確認
    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Material saved successfully!');
      expect(mockRouterPush).toHaveBeenCalledWith('/materials');
    });
  });

  test('handles API error on submit', async () => {
    // APIエラー時のレスポンスをモック
    fetchMock.mockResponseOnce(JSON.stringify({ error: 'Test API Error' }), { status: 500 });

    const user = userEvent.setup();
    render(<NewMaterialPage />);

    const titleInput = screen.getByLabelText(/title/i);
    const fileInput = screen.getByLabelText(/select audio file/i);
    const recordedAtInput = screen.getByLabelText(/recorded at/i);

    // ファイルを選択
    const testFile = new File(['error content'], 'error.wav', { type: 'audio/wav' });
    await user.upload(fileInput, testFile);

    // フォーム入力
    await user.type(titleInput, 'Error Test');
    await user.clear(recordedAtInput);
    await user.type(recordedAtInput, '2024-01-02T12:00');
    
    // フォーム送信
    await submitForm();

    // エラーメッセージが表示されるか
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Test API Error/i);
    });

    // アラートは表示されない
    expect(global.alert).not.toHaveBeenCalled();
    // リダイレクトされない
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  test('handles invalid date format for recordedAt', async () => {
    const user = userEvent.setup();
    render(<NewMaterialPage />);  
    
    const titleInput = screen.getByLabelText(/title/i);
    const fileInput = screen.getByLabelText(/select audio file/i);
    const recordedAtInput = screen.getByLabelText(/recorded at/i) as HTMLInputElement;

    // ファイルを選択
    const testFile = new File(['date content'], 'date.wav', { type: 'audio/wav' });
    await user.upload(fileInput, testFile);

    // タイトルを入力
    await user.type(titleInput, 'Invalid Date Test');

    // recordedAtのvalueを直接セットして、Reactの状態と同期させる
    // 有効な日付を入力
    await user.clear(recordedAtInput);
    await user.type(recordedAtInput, '2024-01-01T10:00');
    
    // 不正な日付を設定（実際には空文字になるが、内部的に無効な日付として処理される）
    Object.defineProperty(recordedAtInput, 'value', {
      writable: true,
      value: 'invalid-date'
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
        
    // APIは呼ばれない
    expect(fetchMock).not.toHaveBeenCalled();
    expect(global.alert).not.toHaveBeenCalled();
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  test('submits all form fields', async () => {
    // API成功時のレスポンスをモック
    fetchMock.mockResponseOnce(JSON.stringify({ id: 'full-id', slug: 'full-slug' }), { status: 201 });

    const user = userEvent.setup();
    render(<NewMaterialPage />);

    // ファイルを選択
    const fileInput = screen.getByLabelText(/select audio file/i);
    const testFile = new File(['full content'], 'full_form.mp3', { type: 'audio/mp3' });
    await user.upload(fileInput, testFile);

    // すべてのフォームフィールドに入力
    await user.type(screen.getByLabelText(/title/i), 'Full Form Test');
    const recordedAtInputForFull = screen.getByLabelText(/recorded at/i);
    await user.clear(recordedAtInputForFull);
    await user.type(recordedAtInputForFull, '2023-03-15T14:30');
    await user.type(screen.getByLabelText(/File Format/i), 'WAV');
    await user.type(screen.getByLabelText(/Sample Rate \(Hz\)/i), '48000');
    await user.type(screen.getByLabelText(/Bit Depth/i), '24');
    await user.type(screen.getByLabelText(/Latitude/i), '35.123');
    await user.type(screen.getByLabelText(/Longitude/i), '139.456');
    await user.type(screen.getByLabelText(/Location Name/i), 'Test Location');
    await user.type(screen.getByLabelText(/Tags/i), 'ambient, field recording, test');
    await user.type(screen.getByLabelText(/Rating/i), '5');
    await user.type(screen.getByTestId('memo-textarea'), 'This is a full test memo.');

    // フォーム送信
    await submitForm();

    // APIが呼ばれるまで待つ
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    // 正しいパラメータでAPIが呼ばれたか確認
    expect(fetchMock).toHaveBeenCalledWith('/api/materials', {
      method: 'POST',
      body: expect.objectContaining({
        append: expect.any(Function),
      }),
    });

    // 成功時の処理を確認
    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Material saved successfully!');
      expect(mockRouterPush).toHaveBeenCalledWith('/materials');
    });
  });

  test('displays error message when required fields are missing', async () => {
    render(<NewMaterialPage />);

    // ファイル未選択の状態でフォームを送信
    await submitForm();

    // エラーメッセージが表示されるか
    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent(/Please select an audio file/i);
    });

    // fetchが呼ばれないことを確認
    expect(fetchMock).not.toHaveBeenCalled();
    expect(global.alert).not.toHaveBeenCalled();
    expect(mockRouterPush).not.toHaveBeenCalled();
  });
}); 
