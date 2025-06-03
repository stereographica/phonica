import {
  apiClient,
  apiRequest,
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  apiPostFormData,
  ApiError,
} from "../api-client";
import fetchMock from "jest-fetch-mock";

// fetchMockを有効化
fetchMock.enableMocks();

describe("api-client", () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  describe("apiClient", () => {
    it("正常なレスポンスを返す", async () => {
      fetchMock.mockResponseOnce("OK", { status: 200 });
      
      const response = await apiClient("/api/test");
      
      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      expect(await response.text()).toBe("OK");
    });

    it("エラーレスポンスでApiErrorをスロー", async () => {
      fetchMock.mockResponseOnce(
        JSON.stringify({ error: "Not found", code: "NOT_FOUND" }),
        { status: 404 }
      );
      
      await expect(apiClient("/api/test")).rejects.toThrow(ApiError);
      
      try {
        await apiClient("/api/test");
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(404);
        expect((error as ApiError).message).toBe("Not found");
        expect((error as ApiError).code).toBe("NOT_FOUND");
      }
    });

    it("JSONでないエラーレスポンスを処理", async () => {
      fetchMock.mockResponseOnce("Internal Server Error", { status: 500 });
      
      await expect(apiClient("/api/test")).rejects.toThrow(ApiError);
      
      try {
        await apiClient("/api/test");
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(500);
        expect((error as ApiError).message).toBe("Internal Server Error");
      }
    });

    it("ネットワークエラーを処理", async () => {
      fetchMock.mockRejectOnce(new Error("Network error"));
      
      await expect(apiClient("/api/test")).rejects.toThrow(ApiError);
      
      try {
        await apiClient("/api/test");
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).message).toBe("Network error");
      }
    });

    it("不明なエラーを処理", async () => {
      fetchMock.mockRejectOnce(new Error("Unknown error"));
      
      await expect(apiClient("/api/test")).rejects.toThrow(ApiError);
      
      try {
        await apiClient("/api/test");
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).message).toBe("ネットワークエラーが発生しました");
      }
    });
  });

  describe("apiRequest", () => {
    it("JSONレスポンスをパース", async () => {
      const mockData = { id: 1, name: "Test" };
      fetchMock.mockResponseOnce(JSON.stringify(mockData), { status: 200 });
      
      const result = await apiRequest("/api/test");
      
      expect(result).toEqual(mockData);
      expect(fetchMock).toHaveBeenCalledWith("/api/test", {
        headers: {
          "Content-Type": "application/json",
        },
      });
    });

    it("204 No Contentでnullを返す", async () => {
      fetchMock.mockResponseOnce("", { status: 204 });
      
      const result = await apiRequest("/api/test");
      
      expect(result).toBeNull();
    });

    it("カスタムヘッダーをマージ", async () => {
      fetchMock.mockResponseOnce("{}", { status: 200 });
      
      await apiRequest("/api/test", {
        headers: {
          Authorization: "Bearer token",
        },
      });
      
      expect(fetchMock).toHaveBeenCalledWith("/api/test", {
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token",
        },
      });
    });
  });

  describe("apiGet", () => {
    it("GETリクエストを送信", async () => {
      const mockData = { id: 1 };
      fetchMock.mockResponseOnce(JSON.stringify(mockData), { status: 200 });
      
      const result = await apiGet("/api/test");
      
      expect(result).toEqual(mockData);
      expect(fetchMock).toHaveBeenCalledWith("/api/test", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
    });
  });

  describe("apiPost", () => {
    it("POSTリクエストを送信", async () => {
      const requestData = { name: "Test" };
      const responseData = { id: 1, ...requestData };
      fetchMock.mockResponseOnce(JSON.stringify(responseData), { status: 201 });
      
      const result = await apiPost("/api/test", requestData);
      
      expect(result).toEqual(responseData);
      expect(fetchMock).toHaveBeenCalledWith("/api/test", {
        method: "POST",
        body: JSON.stringify(requestData),
        headers: {
          "Content-Type": "application/json",
        },
      });
    });

    it("データなしでPOSTリクエストを送信", async () => {
      fetchMock.mockResponseOnce("{}", { status: 200 });
      
      await apiPost("/api/test");
      
      expect(fetchMock).toHaveBeenCalledWith("/api/test", {
        method: "POST",
        body: undefined,
        headers: {
          "Content-Type": "application/json",
        },
      });
    });
  });

  describe("apiPut", () => {
    it("PUTリクエストを送信", async () => {
      const requestData = { name: "Updated" };
      const responseData = { id: 1, ...requestData };
      fetchMock.mockResponseOnce(JSON.stringify(responseData), { status: 200 });
      
      const result = await apiPut("/api/test/1", requestData);
      
      expect(result).toEqual(responseData);
      expect(fetchMock).toHaveBeenCalledWith("/api/test/1", {
        method: "PUT",
        body: JSON.stringify(requestData),
        headers: {
          "Content-Type": "application/json",
        },
      });
    });
  });

  describe("apiDelete", () => {
    it("DELETEリクエストを送信", async () => {
      fetchMock.mockResponseOnce("", { status: 204 });
      
      const result = await apiDelete("/api/test/1");
      
      expect(result).toBeNull();
      expect(fetchMock).toHaveBeenCalledWith("/api/test/1", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });
    });
  });

  describe("apiPostFormData", () => {
    it("FormDataをPOST", async () => {
      const formData = new FormData();
      formData.append("file", "test");
      const responseData = { id: 1, filename: "test.txt" };
      fetchMock.mockResponseOnce(JSON.stringify(responseData), { status: 201 });
      
      const result = await apiPostFormData("/api/upload", formData);
      
      expect(result).toEqual(responseData);
      expect(fetchMock).toHaveBeenCalledWith("/api/upload", {
        method: "POST",
        body: formData,
      });
    });

    it("204 No Contentでnullを返す", async () => {
      const formData = new FormData();
      fetchMock.mockResponseOnce("", { status: 204 });
      
      const result = await apiPostFormData("/api/upload", formData);
      
      expect(result).toBeNull();
    });

    it("エラーレスポンスでApiErrorをスロー", async () => {
      const formData = new FormData();
      fetchMock.mockResponse(
        JSON.stringify({ message: "File too large" }),
        { status: 413 }
      );
      
      await expect(apiPostFormData("/api/upload", formData)).rejects.toThrow(ApiError);
      
      fetchMock.resetMocks();
      fetchMock.mockResponseOnce(
        JSON.stringify({ message: "File too large" }),
        { status: 413 }
      );
      
      try {
        await apiPostFormData("/api/upload", formData);
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(413);
        expect((error as ApiError).message).toBe("File too large");
      }
    });
  });

  describe("ApiError", () => {
    it("正しくインスタンス化される", () => {
      const error = new ApiError("Test error", 400, "TEST_ERROR", { detail: "test" });
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ApiError);
      expect(error.name).toBe("ApiError");
      expect(error.message).toBe("Test error");
      expect(error.status).toBe(400);
      expect(error.code).toBe("TEST_ERROR");
      expect(error.data).toEqual({ detail: "test" });
    });
  });
});