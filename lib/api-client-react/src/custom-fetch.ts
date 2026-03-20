// =========================
// TYPES
// =========================

export type CustomFetchOptions = RequestInit & {
  responseType?: "json" | "text" | "blob" | "auto";
};

export type ErrorType<T = unknown> = ApiError<T>;
export type BodyType<T> = T;

// =========================
// CONSTANTS
// =========================

const NO_BODY_STATUS = new Set([204, 205, 304]);
const DEFAULT_JSON_ACCEPT = "application/json, application/problem+json";

// =========================
// HELPERS
// =========================

function isRequest(input: RequestInfo | URL): input is Request {
  return typeof Request !== "undefined" && input instanceof Request;
}

function resolveMethod(input: RequestInfo | URL, explicitMethod?: string): string {
  if (explicitMethod) return explicitMethod.toUpperCase();
  if (isRequest(input)) return input.method.toUpperCase();
  return "GET";
}

function isUrl(input: RequestInfo | URL): input is URL {
  return typeof URL !== "undefined" && input instanceof URL;
}

function resolveUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (isUrl(input)) return input.toString();
  return input.url;
}

function resolveApiBaseUrl(): string {
  if (typeof window === "undefined") return "";

  const viteEnv = (import.meta as ImportMeta & {
    env?: Record<string, string | undefined>;
  }).env;

  const envBaseUrl =
    typeof viteEnv?.VITE_API_BASE_URL === "string"
      ? viteEnv.VITE_API_BASE_URL.trim()
      : "";

  if (envBaseUrl) {
    return envBaseUrl.replace(/\/$/, "");
  }

  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return "http://127.0.0.1:3000";
  }

  return "";
}

function resolveRequestInput(input: RequestInfo | URL): RequestInfo | URL {
  const url = resolveUrl(input);

  if (!url.startsWith("/api/")) {
    return input;
  }

  const baseUrl = resolveApiBaseUrl();

  if (!baseUrl) {
    return input;
  }

  return `${baseUrl}${url}`;
}

function mergeHeaders(...sources: Array<HeadersInit | undefined>): Headers {
  const headers = new Headers();

  for (const source of sources) {
    if (!source) continue;
    new Headers(source).forEach((value, key) => {
      headers.set(key, value);
    });
  }

  return headers;
}

function getMediaType(headers: Headers): string | null {
  const value = headers.get("content-type");
  return value ? value.split(";", 1)[0].trim().toLowerCase() : null;
}

function isJsonMediaType(mediaType: string | null): boolean {
  return mediaType === "application/json" || Boolean(mediaType?.endsWith("+json"));
}

function isTextMediaType(mediaType: string | null): boolean {
  return Boolean(
    mediaType &&
      (mediaType.startsWith("text/") ||
        mediaType.includes("xml") ||
        mediaType === "application/x-www-form-urlencoded"),
  );
}

function hasNoBody(response: Response, method: string): boolean {
  if (method === "HEAD") return true;
  if (NO_BODY_STATUS.has(response.status)) return true;
  if (response.headers.get("content-length") === "0") return true;
  if (response.body == null) return true;
  return false;
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function looksLikeJson(text: string): boolean {
  const trimmed = text.trimStart();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}

// =========================
// ERRORS
// =========================

export class ApiError<T = unknown> extends Error {
  readonly name = "ApiError";
  readonly status: number;
  readonly data: T | null;

  constructor(response: Response, data: T | null) {
    super(`HTTP ${response.status}`);
    this.status = response.status;
    this.data = data;
  }
}

// =========================
// PARSERS
// =========================

async function parseJsonBody(response: Response): Promise<unknown> {
  const raw = await response.text();
  const normalized = stripBom(raw);
  if (!normalized.trim()) return null;
  return JSON.parse(normalized);
}

async function parseSuccessBody(
  response: Response,
  responseType: "json" | "text" | "blob" | "auto",
): Promise<unknown> {
  if (hasNoBody(response, "GET")) return null;

  const type = responseType === "auto" ? "json" : responseType;

  if (type === "json") return parseJsonBody(response);
  if (type === "text") return response.text();
  if (type === "blob") return response.blob();

  return null;
}

// =========================
// MAIN FUNCTION
// =========================

export async function customFetch<T = unknown>(
  input: RequestInfo | URL,
  options: CustomFetchOptions = {},
): Promise<T> {
  const { responseType = "auto", headers: headersInit, ...init } = options;
  const requestInput = resolveRequestInput(input);

  const method = resolveMethod(requestInput, init.method);

  const headers = mergeHeaders(isRequest(requestInput) ? requestInput.headers : undefined, headersInit);

  if (
    typeof init.body === "string" &&
    !headers.has("content-type") &&
    looksLikeJson(init.body)
  ) {
    headers.set("content-type", "application/json");
  }

  if (responseType === "json" && !headers.has("accept")) {
    headers.set("accept", DEFAULT_JSON_ACCEPT);
  }

  const response = await fetch(requestInput, { ...init, method, headers });

  if (!response.ok) {
    throw new ApiError(response, null);
  }

  return (await parseSuccessBody(response, responseType)) as T;
}
