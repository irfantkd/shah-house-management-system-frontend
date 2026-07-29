import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { logoutSync } from "../store/slices/authSlice";

const API_URL = import.meta.env.VITE_API_URL;
export const API_BASE_URL = API_URL;

// Extract first path segment as the cache tag: '/expenses?foo=bar' → 'expenses'
function resourceTag(path) {
  return path.replace(/^\//, "").split(/[/?]/)[0] || "root";
}

// Mutations to these resources also bust the dashboard cache
const DASHBOARD_DEPS = new Set([
  "expenses", "wallet", "tasks", "contracts", "employees",
  "cars", "repairs", "home-info", "assets",
]);

// All resource tag types known to this app
const TAG_TYPES = [
  "properties", "cars", "employees", "expenses", "expense-categories",
  "wallet", "tasks", "task-categories", "contracts", "companies", "company-categories",
  "areas", "assets", "floors", "owners", "notifications", "dashboard",
  "settings", "home-info", "users", "letterheads", "repairs", "warranties",
  "history", "transactions", "auth",
];

const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

const baseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth?.token;
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return headers;
  },
});

let handlingLogout = false;

const baseQueryWithReauth = async (args, api, extraOptions) => {
  const result = await baseQuery(args, api, extraOptions);

  const is401 =
    result.error?.status === 401 || result.meta?.response?.status === 401;

  if (is401 && !handlingLogout) {
    handlingLogout = true;
    api.dispatch(logoutSync());
    localStorage.removeItem("ahms-token");
    setTimeout(() => { handlingLogout = false; }, 3000);
  }

  const contentType = result.meta?.response?.headers.get("content-type");
  if (!contentType || contentType.includes("application/json")) return result;
  if (contentType.includes("application/octet-stream") || contentType.includes("application/pdf")) {
    return { data: result.meta.response };
  }
  return result;
};

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  keepUnusedDataFor: 300,   // cache for 5 minutes — navigating between pages won't re-fetch
  refetchOnFocus: false,    // don't re-fetch just because the window regained focus
  refetchOnReconnect: true, // do re-fetch after network reconnects
  tagTypes: TAG_TYPES,
  endpoints: (builder) => ({

    // ── GET (query) ────────────────────────────────────────────────────────
    get: builder.query({
      query: ({ path, params }) => ({
        url: path,
        method: "GET",
        params,
        headers: { Accept: "application/json" },
      }),
      // Tag by the resource name so only related mutations bust this cache
      providesTags: (result, error, { path }) => {
        const tag = resourceTag(path);
        return [{ type: tag, id: "LIST" }];
      },
      transformResponse: (response) => response?.data ?? response,
    }),

    // ── POST (mutation) ────────────────────────────────────────────────────
    post: builder.mutation({
      query: ({ path, body }) => {
        const isFormData = body instanceof FormData;
        return {
          url: path,
          method: "POST",
          body,
          ...(isFormData
            ? {}
            : { headers: { "Content-Type": "application/json", Accept: "application/json" } }),
        };
      },
      invalidatesTags: (result, error, { path }) => {
        const tag = resourceTag(path);
        const tags = [{ type: tag, id: "LIST" }];
        if (DASHBOARD_DEPS.has(tag)) tags.push({ type: "dashboard", id: "LIST" });
        return tags;
      },
    }),

    // ── PUT (mutation) ─────────────────────────────────────────────────────
    put: builder.mutation({
      query: ({ path, body }) => ({
        url: path,
        method: "PUT",
        body,
        headers: { Accept: "application/json" },
      }),
      invalidatesTags: (result, error, { path }) => {
        const tag = resourceTag(path);
        const tags = [{ type: tag, id: "LIST" }];
        if (DASHBOARD_DEPS.has(tag)) tags.push({ type: "dashboard", id: "LIST" });
        return tags;
      },
    }),

    // ── PATCH (mutation) ───────────────────────────────────────────────────
    patch: builder.mutation({
      query: ({ path, body }) => ({
        url: path,
        method: "PATCH",
        body,
        headers: { Accept: "application/json" },
      }),
      invalidatesTags: (result, error, { path }) => {
        const tag = resourceTag(path);
        const tags = [{ type: tag, id: "LIST" }];
        if (DASHBOARD_DEPS.has(tag)) tags.push({ type: "dashboard", id: "LIST" });
        return tags;
      },
    }),

    // ── DELETE (mutation) ──────────────────────────────────────────────────
    delete: builder.mutation({
      query: ({ path }) => ({
        url: path,
        method: "DELETE",
        headers: { Accept: "application/json" },
      }),
      invalidatesTags: (result, error, { path }) => {
        const tag = resourceTag(path);
        const tags = [{ type: tag, id: "LIST" }];
        if (DASHBOARD_DEPS.has(tag)) tags.push({ type: "dashboard", id: "LIST" });
        return tags;
      },
    }),

    // ── Smart POST — handles both JSON and file (PDF/blob) responses ───────
    smartPost: builder.mutation({
      queryFn: async ({ path, body, filename }, api) => {
        try {
          const token = api.getState().auth?.token;
          const isFormData = body instanceof FormData;
          const response = await fetch(`${API_URL}${path}`, {
            method: "POST",
            headers: {
              Accept: "application/json, application/pdf, application/octet-stream",
              ...(token && { Authorization: `Bearer ${token}` }),
              ...(isFormData ? {} : { "Content-Type": "application/json" }),
            },
            body: isFormData ? body : JSON.stringify(body),
          });
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return { error: { status: response.status, data: errorData } };
          }
          const contentType = response.headers.get("content-type");
          if (contentType?.includes("application/pdf") || contentType?.includes("application/octet-stream")) {
            const blob = await response.blob();
            const cd = response.headers.get("content-disposition");
            let finalFilename = filename || "document.pdf";
            if (cd) {
              const m = cd.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
              if (m?.[1]) finalFilename = m[1].replace(/['"]/g, "");
            }
            downloadBlob(blob, finalFilename);
            return { data: { isFile: true, filename: finalFilename } };
          }
          const json = await response.json();
          return { data: { isFile: false, ...json } };
        } catch (error) {
          return { error: { status: "FETCH_ERROR", error: error.message } };
        }
      },
      invalidatesTags: (result, error, { path }) => {
        const tag = resourceTag(path);
        const tags = [{ type: tag, id: "LIST" }];
        if (DASHBOARD_DEPS.has(tag)) tags.push({ type: "dashboard", id: "LIST" });
        return tags;
      },
    }),

    // ── PDF download via POST ──────────────────────────────────────────────
    postWithPdfDownload: builder.mutation({
      queryFn: async ({ path, body, filename }, api) => {
        try {
          const token = api.getState().auth?.token;
          const response = await fetch(`${API_URL}${path}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/pdf, application/octet-stream",
              ...(token && { Authorization: `Bearer ${token}` }),
            },
            body: JSON.stringify(body),
          });
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return { error: { status: response.status, data: errorData } };
          }
          const contentType = response.headers.get("content-type");
          if (contentType?.includes("application/pdf") || contentType?.includes("application/octet-stream")) {
            const blob = await response.blob();
            const cd = response.headers.get("content-disposition");
            let finalFilename = filename || "challan.pdf";
            if (cd) {
              const m = cd.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
              if (m?.[1]) finalFilename = m[1].replace(/['"]/g, "");
            }
            downloadBlob(blob, finalFilename);
            return { data: { success: true, filename: finalFilename, message: "PDF downloaded successfully" } };
          }
          const jsonData = await response.json();
          return { data: jsonData };
        } catch (error) {
          return { error: { status: "FETCH_ERROR", error: error.message } };
        }
      },
    }),

    // ── File/CSV/PDF download via GET ──────────────────────────────────────
    downloadChallan: builder.mutation({
      queryFn: async ({ path, params, filename }, api) => {
        try {
          const token = api.getState().auth?.token;
          const qs = params
            ? "?" + Object.entries(params)
                .filter(([, v]) => v !== "" && v !== undefined && v !== null)
                .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
                .join("&")
            : "";
          const response = await fetch(`${API_URL}${path}${qs}`, {
            method: "GET",
            headers: {
              Accept: "application/pdf, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/octet-stream",
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          });
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return { error: { status: response.status, data: errorData } };
          }
          const contentType = response.headers.get("content-type");
          const isDownloadable =
            contentType?.includes("application/pdf") ||
            contentType?.includes("application/octet-stream") ||
            contentType?.includes("text/csv") ||
            contentType?.includes("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
          if (isDownloadable) {
            const blob = await response.blob();
            const cd = response.headers.get("content-disposition");
            let finalFilename = filename || "download.pdf";
            if (cd) {
              const m = cd.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
              if (m?.[1]) finalFilename = m[1].replace(/['"]/g, "");
            }
            downloadBlob(blob, finalFilename);
            return { data: { success: true, filename: finalFilename, message: "Downloaded successfully" } };
          }
          const jsonData = await response.json();
          return { data: jsonData };
        } catch (error) {
          return { error: { status: "FETCH_ERROR", error: error.message } };
        }
      },
    }),

  }),
});

export const {
  useGetQuery,
  usePostMutation,
  usePostWithPdfDownloadMutation,
  usePutMutation,
  useDeleteMutation,
  useSmartPostMutation,
  usePatchMutation,
  useUploadChallanMutation,
  useDownloadChallanMutation,
  useIsFetching,
} = apiSlice;

export default apiSlice.reducer;
