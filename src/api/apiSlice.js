import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { logoutSync } from "../store/slices/authSlice";

const API_URL = import.meta.env.VITE_API_URL;
export const API_BASE_URL = API_URL; // exported for imperative fetch calls

// Helper function to download blob
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

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    // Don't set Accept header here for flexibility
    return headers;
  },
});

// Guard: only dispatch logout + redirect once even if many queries fail with 401 simultaneously
let handlingLogout = false;

const baseQueryWithReauthAndRedirect = async (args, api, extraOptions) => {
  // original request
  let result = await baseQuery(args, api, extraOptions);

  // ---------- 401 detection ----------
  const is401 =
    result.error?.status === 401 || result.meta?.response?.status === 401;

  if (is401 && !handlingLogout) {
    handlingLogout = true;
    api.dispatch(logoutSync());          // clears Redux state synchronously
    localStorage.removeItem('ahms-token'); // clear persisted token key
    setTimeout(() => { handlingLogout = false; }, 3000);
    // No hard redirect — ProtectedRoute watches isAuth and navigates via React Router
  }

  const contentType = result.meta?.response?.headers.get("content-type");

  if (!contentType || contentType.includes("application/json")) {
    return result;
  } else if (
    contentType.includes("application/octet-stream") ||
    contentType.includes("application/pdf")
  ) {
    return { data: result.meta.response };
  } else {
    return result;
  }
};
export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauthAndRedirect,
  tagTypes: ["KeyName"],
  endpoints: (builder) => ({
    get: builder.query({
      query: ({ path, params }) => ({
        url: path,
        method: "GET",
        params,
        headers: {
          Accept: "application/json",
        },
      }),
      providesTags: (result, error, { path }) =>
        result ? [{ type: "KeyName", id: path }] : ["KeyName"],
      transformResponse: (response) => response?.data ?? response,
    }),

    post: builder.mutation({
      query: ({ path, body }) => {
        const isFormData = body instanceof FormData;

        return {
          url: path,
          method: "POST",
          body,
          ...(isFormData
            ? {} // ❗ DO NOT set headers for FormData
            : {
                headers: {
                  "Content-Type": "application/json",
                  Accept: "application/json",
                },
              }),
        };
      },
      invalidatesTags: ["KeyName"],
    }),

    smartPost: builder.mutation({
      queryFn: async ({ path, body, filename }, api) => {
        try {
          const token = api.getState().auth?.token;

          const isFormData = body instanceof FormData;

          const response = await fetch(`${API_URL}${path}`, {
            method: "POST",
            headers: {
              Accept:
                "application/json, application/pdf, application/octet-stream",
              ...(token && { Authorization: `Bearer ${token}` }),
              // ❌ DO NOT set Content-Type for FormData
              ...(isFormData ? {} : { "Content-Type": "application/json" }),
            },
            body: isFormData ? body : JSON.stringify(body),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return {
              error: {
                status: response.status,
                data: errorData,
              },
            };
          }

          const contentType = response.headers.get("content-type");

          // ✅ PDF / FILE RESPONSE
          if (
            contentType?.includes("application/pdf") ||
            contentType?.includes("application/octet-stream")
          ) {
            const blob = await response.blob();

            const contentDisposition = response.headers.get(
              "content-disposition",
            );

            let finalFilename = filename || "document.pdf";

            if (contentDisposition) {
              const match = contentDisposition.match(
                /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/,
              );
              if (match && match[1]) {
                finalFilename = match[1].replace(/['"]/g, "");
              }
            }

            downloadBlob(blob, finalFilename);

            return {
              data: {
                isFile: true,
                filename: finalFilename,
              },
            };
          }

          // ✅ JSON RESPONSE
          const json = await response.json();
          return {
            data: {
              isFile: false,
              ...json,
            },
          };
        } catch (error) {
          return {
            error: {
              status: "FETCH_ERROR",
              error: error.message,
            },
          };
        }
      },
      invalidatesTags: ["KeyName"],
    }),

    postWithPdfDownload: builder.mutation({
      queryFn: async ({ path, body, filename }, api) => {
        try {
          const state = api.getState();
          const token = state.auth?.token;

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
            return {
              error: {
                status: response.status,
                data: errorData,
              },
            };
          }

          const contentType = response.headers.get("content-type");

          if (
            contentType?.includes("application/pdf") ||
            contentType?.includes("application/octet-stream")
          ) {
            const blob = await response.blob();

            const contentDisposition = response.headers.get(
              "content-disposition",
            );
            let finalFilename = filename || "challan.pdf";

            if (contentDisposition) {
              const filenameMatch = contentDisposition.match(
                /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/,
              );
              if (filenameMatch && filenameMatch[1]) {
                finalFilename = filenameMatch[1].replace(/['"]/g, "");
              }
            }

            downloadBlob(blob, finalFilename);

            return {
              data: {
                success: true,
                filename: finalFilename,
                message: "PDF downloaded successfully",
              },
            };
          } else {
            const jsonData = await response.json();
            return { data: jsonData };
          }
        } catch (error) {
          console.error("PDF Download Error:", error);
          return {
            error: {
              status: "FETCH_ERROR",
              error: error.message,
            },
          };
        }
      },
      invalidatesTags: ["KeyName"],
    }),

    downloadChallan: builder.mutation({
      queryFn: async ({ path, params, filename }, api) => {
        try {
          const state = api.getState();
          const token = state.auth?.token;

          const queryString = params
            ? "?" +
              Object.keys(params)
                .filter(
                  (key) =>
                    params[key] !== "" &&
                    params[key] !== undefined &&
                    params[key] !== null,
                )
                .map(
                  (key) =>
                    `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`,
                )
                .join("&")
            : "";

          const response = await fetch(`${API_URL}${path}${queryString}`, {
            method: "GET",
            headers: {
              // ✅ Accept all possible download formats
              Accept:
                "application/pdf, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/octet-stream",
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return { error: { status: response.status, data: errorData } };
          }

          const contentType = response.headers.get("content-type");

          // ✅ Handle all downloadable content types
          const isDownloadable =
            contentType?.includes("application/pdf") ||
            contentType?.includes("application/octet-stream") ||
            contentType?.includes("text/csv") ||
            contentType?.includes(
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            );

          if (isDownloadable) {
            const blob = await response.blob();

            const contentDisposition = response.headers.get(
              "content-disposition",
            );
            let finalFilename = filename || "students.pdf";

            if (contentDisposition) {
              const filenameMatch = contentDisposition.match(
                /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/,
              );
              if (filenameMatch?.[1]) {
                finalFilename = filenameMatch[1].replace(/['"]/g, "");
              }
            }

            downloadBlob(blob, finalFilename);

            return {
              data: {
                success: true,
                filename: finalFilename,
                message: "Downloaded successfully",
              },
            };
          } else {
            const jsonData = await response.json();
            return { data: jsonData };
          }
        } catch (error) {
          console.error("Download Error:", error);
          return { error: { status: "FETCH_ERROR", error: error.message } };
        }
      },
    }),
    put: builder.mutation({
      query: ({ path, body }) => ({
        url: path,
        method: "PUT",
        body,
        headers: {
          Accept: "application/json",
        },
      }),
      invalidatesTags: ["KeyName"],
    }),

    delete: builder.mutation({
      query: ({ path }) => ({
        url: path,
        method: "DELETE",
        headers: {
          Accept: "application/json",
        },
      }),
      invalidatesTags: ["KeyName"],
    }),

    patch: builder.mutation({
      query: ({ path, body }) => ({
        url: path,
        method: "PATCH",
        body,
        headers: {
          Accept: "application/json",
        },
      }),
      invalidatesTags: ["KeyName"],
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
