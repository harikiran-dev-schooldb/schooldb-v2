export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number
  ) {
    super(message);
  }
}

async function request<T>(
  input: RequestInfo,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(input, init);

  const result = await res.json();

  if (!result.success) {
    throw new ApiError(
      result.message ?? "Something went wrong.",
      res.status
    );
  }

  return result.data as T;
}

export const api = {
  get<T>(url: string) {
    return request<T>(url);
  },

  post<T>(
    url: string,
    body: unknown
  ) {
    return request<T>(url, {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify(body),
    });
  },

  put<T>(
    url: string,
    body: unknown
  ) {
    return request<T>(url, {
      method: "PUT",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify(body),
    });
  },

  delete<T>(url: string) {
    return request<T>(url, {
      method: "DELETE",
    });
  },
};