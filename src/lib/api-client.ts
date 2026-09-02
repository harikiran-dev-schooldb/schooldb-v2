export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number
  ) {
    super(message);
  }
}

function withTenantHeader(input: RequestInfo, init?: RequestInit): RequestInit {
  const headers = new Headers(init?.headers);

  if (typeof window !== "undefined") {
    const match = window.location.pathname.match(/^\/([^/]+)/);
    const schoolSlug = match?.[1];

    if (schoolSlug && schoolSlug !== "login" && schoolSlug !== "register") {
      headers.set("x-school-slug", schoolSlug);
    }
  }

  return {
    ...init,
    headers,
  };
}

async function request<T>(
  input: RequestInfo,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(input, withTenantHeader(input, init));

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

  post<T>(url: string, body: unknown) {
    return request<T>(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  },

  put<T>(url: string, body: unknown) {
    return request<T>(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
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
