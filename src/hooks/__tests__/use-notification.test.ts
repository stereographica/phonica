import { renderHook, act } from "@testing-library/react";
import { useNotification, parseApiError } from "../use-notification";
import { useToast } from "../use-toast";

// use-toastをモック
jest.mock("../use-toast");

describe("useNotification", () => {
  const mockToast = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    (useToast as jest.Mock).mockReturnValue({ toast: mockToast });
    
    // console.errorをモック
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("notifyError", () => {
    it("エラー通知を表示する", () => {
      const { result } = renderHook(() => useNotification());
      
      act(() => {
        result.current.notifyError({ status: 404 });
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: "エラー",
        description: "要求されたリソースが見つかりません。",
        variant: "destructive",
        duration: 5000,
      });
    });

    it("操作とエンティティを指定してエラー通知を表示する", () => {
      const { result } = renderHook(() => useNotification());
      
      act(() => {
        result.current.notifyError({}, { operation: "create", entity: "material" });
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: "エラー",
        description: "素材の登録に失敗しました。",
        variant: "destructive",
        duration: 5000,
      });
    });

    it("カスタムdurationを指定できる", () => {
      const { result } = renderHook(() => useNotification());
      
      act(() => {
        result.current.notifyError({ status: 500 }, { duration: 10000 });
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: "エラー",
        description: "サーバーエラーが発生しました。",
        variant: "destructive",
        duration: 10000,
      });
    });

    it("開発環境ではコンソールにエラーを出力する", () => {
      const originalEnv = process.env.NODE_ENV;
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        writable: true,
        configurable: true
      });
      
      const { result } = renderHook(() => useNotification());
      const error = { status: 404, message: "Not found" };
      
      act(() => {
        result.current.notifyError(error);
      });

      expect(console.error).toHaveBeenCalledWith("Error details:", error);
      
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalEnv,
        writable: true,
        configurable: true
      });
    });

    it("本番環境ではコンソールにエラーを出力しない", () => {
      const originalEnv = process.env.NODE_ENV;
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        writable: true,
        configurable: true
      });
      
      const { result } = renderHook(() => useNotification());
      
      act(() => {
        result.current.notifyError({ status: 404 });
      });

      expect(console.error).not.toHaveBeenCalled();
      
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalEnv,
        writable: true,
        configurable: true
      });
    });
  });

  describe("notifySuccess", () => {
    it("成功通知を表示する", () => {
      const { result } = renderHook(() => useNotification());
      
      act(() => {
        result.current.notifySuccess("create", "material");
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: "成功",
        description: "素材を登録しました。",
        variant: "success",
        duration: 3000,
      });
    });

    it("エンティティなしで成功通知を表示する", () => {
      const { result } = renderHook(() => useNotification());
      
      act(() => {
        result.current.notifySuccess("update");
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: "成功",
        description: "データを更新しました。",
        variant: "success",
        duration: 3000,
      });
    });

    it("カスタムdurationを指定できる", () => {
      const { result } = renderHook(() => useNotification());
      
      act(() => {
        result.current.notifySuccess("delete", "tag", { duration: 2000 });
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: "成功",
        description: "タグを削除しました。",
        variant: "success",
        duration: 2000,
      });
    });
  });

  describe("notifyInfo", () => {
    it("情報通知を表示する", () => {
      const { result } = renderHook(() => useNotification());
      
      act(() => {
        result.current.notifyInfo("お知らせ", "新機能が追加されました");
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: "お知らせ",
        description: "新機能が追加されました",
        duration: 4000,
      });
    });

    it("説明なしで情報通知を表示する", () => {
      const { result } = renderHook(() => useNotification());
      
      act(() => {
        result.current.notifyInfo("処理中...");
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: "処理中...",
        description: undefined,
        duration: 4000,
      });
    });
  });

  describe("notifyWarning", () => {
    it("警告通知を表示する", () => {
      const { result } = renderHook(() => useNotification());
      
      act(() => {
        result.current.notifyWarning("注意", "ファイルサイズが大きいです");
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: "注意",
        description: "ファイルサイズが大きいです",
        variant: "default",
        duration: 4000,
      });
    });
  });
});

describe("parseApiError", () => {
  it("Responseオブジェクトをパースする", () => {
    const error = {
      status: 404,
      statusText: "Not Found",
    };

    expect(parseApiError(error)).toEqual({
      status: 404,
      message: "Not Found",
    });
  });

  it("statusTextがない場合はデフォルトメッセージを使用", () => {
    const error = {
      status: 500,
    };

    expect(parseApiError(error)).toEqual({
      status: 500,
      message: "Unknown error",
    });
  });

  it("エラーオブジェクトをパースする", () => {
    const error = {
      message: "Something went wrong",
      code: "ERR_001",
    };

    expect(parseApiError(error)).toEqual({
      message: "Something went wrong",
      code: "ERR_001",
    });
  });

  it("不明なエラーの場合はデフォルトメッセージを返す", () => {
    expect(parseApiError(null)).toEqual({
      message: "Unknown error occurred",
    });
    
    expect(parseApiError(undefined)).toEqual({
      message: "Unknown error occurred",
    });
    
    expect(parseApiError("string error")).toEqual({
      message: "Unknown error occurred",
    });
    
    expect(parseApiError(123)).toEqual({
      message: "Unknown error occurred",
    });
  });
});