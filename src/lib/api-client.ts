/**
 * APIクライアント - fetchのラッパー with エラーハンドリング
 */

import { parseApiError, type ApiErrorResponse } from "@/hooks/use-notification";

// APIエラークラス
export class ApiError extends Error {
  public status?: number;
  public code?: string;
  public data?: unknown;

  constructor(message: string, status?: number, code?: string, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

// fetch関数のラッパー
export async function apiClient(
  url: string,
  options?: RequestInit
): Promise<Response> {
  try {
    const response = await fetch(url, options);

    // エラーレスポンスの場合
    if (!response.ok) {
      let errorData: ApiErrorResponse = {
        status: response.status,
        message: response.statusText,
      };

      // JSONレスポンスのパース試行
      try {
        const jsonData = await response.json();
        errorData = {
          ...errorData,
          ...jsonData,
        };
      } catch {
        // JSONパースエラーは無視
      }

      throw new ApiError(
        errorData.message || errorData.error || response.statusText,
        response.status,
        errorData.code,
        errorData
      );
    }

    return response;
  } catch (error) {
    // ネットワークエラーなどの場合
    if (error instanceof ApiError) {
      throw error;
    }

    // その他のエラー
    const parsedError = parseApiError(error);
    throw new ApiError(
      parsedError.message || "ネットワークエラーが発生しました",
      parsedError.status,
      parsedError.code
    );
  }
}

// JSON APIリクエスト用のヘルパー関数
export async function apiRequest<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await apiClient(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  // 204 No Contentの場合
  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}

// GET リクエスト
export async function apiGet<T = unknown>(
  url: string,
  options?: Omit<RequestInit, "method" | "body">
): Promise<T> {
  return apiRequest<T>(url, {
    ...options,
    method: "GET",
  });
}

// POST リクエスト
export async function apiPost<T = unknown>(
  url: string,
  data?: unknown,
  options?: Omit<RequestInit, "method" | "body">
): Promise<T> {
  return apiRequest<T>(url, {
    ...options,
    method: "POST",
    body: data ? JSON.stringify(data) : undefined,
  });
}

// PUT リクエスト
export async function apiPut<T = unknown>(
  url: string,
  data?: unknown,
  options?: Omit<RequestInit, "method" | "body">
): Promise<T> {
  return apiRequest<T>(url, {
    ...options,
    method: "PUT",
    body: data ? JSON.stringify(data) : undefined,
  });
}

// DELETE リクエスト
export async function apiDelete<T = unknown>(
  url: string,
  options?: Omit<RequestInit, "method">
): Promise<T> {
  return apiRequest<T>(url, {
    ...options,
    method: "DELETE",
  });
}

// FormData用のPOSTリクエスト
export async function apiPostFormData<T = unknown>(
  url: string,
  formData: FormData,
  options?: Omit<RequestInit, "method" | "body">
): Promise<T> {
  const response = await apiClient(url, {
    ...options,
    method: "POST",
    body: formData,
    // Content-Typeは自動設定されるため指定しない
  });

  // 204 No Contentの場合
  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}