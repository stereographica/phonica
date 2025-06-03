"use client";

import { useToast } from "@/hooks/use-toast";
import { getErrorMessage, getSuccessMessage } from "@/lib/error-messages";
import { useCallback } from "react";

type NotificationOptions = {
  operation?: string;
  entity?: string;
  duration?: number;
};

export function useNotification() {
  const { toast } = useToast();

  // エラー通知を表示
  const notifyError = useCallback(
    (error: unknown, options?: NotificationOptions) => {
      const message = getErrorMessage(error, options?.operation, options?.entity);
      
      toast({
        title: "エラー",
        description: message,
        variant: "destructive",
        duration: options?.duration || 5000,
      });

      // 開発環境ではコンソールにもエラーを出力
      if (process.env.NODE_ENV === "development") {
        console.error("Error details:", error);
      }
    },
    [toast]
  );

  // 成功通知を表示
  const notifySuccess = useCallback(
    (operation: string, entity?: string, options?: NotificationOptions) => {
      const message = getSuccessMessage(operation, entity);
      
      toast({
        title: "成功",
        description: message,
        duration: options?.duration || 3000,
      });
    },
    [toast]
  );

  // 情報通知を表示
  const notifyInfo = useCallback(
    (title: string, description?: string, options?: NotificationOptions) => {
      toast({
        title,
        description,
        duration: options?.duration || 4000,
      });
    },
    [toast]
  );

  // 警告通知を表示
  const notifyWarning = useCallback(
    (title: string, description?: string, options?: NotificationOptions) => {
      toast({
        title,
        description,
        variant: "default", // 警告用のvariantがない場合はdefaultを使用
        duration: options?.duration || 4000,
      });
    },
    [toast]
  );

  return {
    notifyError,
    notifySuccess,
    notifyInfo,
    notifyWarning,
  };
}

// APIエラーレスポンスの型定義
export interface ApiErrorResponse {
  error?: string;
  message?: string;
  status?: number;
  code?: string;
}

// APIエラーをパース
export function parseApiError(error: unknown): ApiErrorResponse {
  if (error && typeof error === "object") {
    // Response オブジェクトの場合
    if ("status" in error) {
      const errorWithStatus = error as { status: unknown; statusText?: unknown };
      if (typeof errorWithStatus.status === "number") {
        return {
          status: errorWithStatus.status,
          message: typeof errorWithStatus.statusText === "string" ? errorWithStatus.statusText : "Unknown error",
        };
      }
    }
    
    // エラーオブジェクトの場合
    if ("message" in error) {
      const errorWithMessage = error as { message: unknown; code?: unknown };
      return {
        message: typeof errorWithMessage.message === "string" ? errorWithMessage.message : "Unknown error occurred",
        code: typeof errorWithMessage.code === "string" ? errorWithMessage.code : undefined,
      };
    }
  }
  
  return {
    message: "Unknown error occurred",
  };
}