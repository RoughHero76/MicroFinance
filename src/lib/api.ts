// The one HTTP client (F-2). Feature api.ts files call these helpers; screens
// never build URLs themselves.

import axios, {AxiosError, type AxiosRequestConfig} from 'axios';
import {brand} from '@/brand';
import {currentLang} from '@/i18n';
import {getToken} from './session';

export type ApiErrorKind = 'offline' | 'timeout' | 'http' | 'unknown';

/** Everything that can go wrong with a request, in one shape. */
export class ApiError extends Error {
  kind: ApiErrorKind;
  status?: number;
  /** Machine-readable code from the server (BE-12), when it sends one. */
  code?: string;
  /** The server's message, already in the user's language (BE-20). */
  serverMessage?: string;
  data?: unknown;

  constructor(kind: ApiErrorKind, opts: {status?: number; code?: string; serverMessage?: string; data?: unknown} = {}) {
    super(opts.serverMessage || kind);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = opts.status;
    this.code = opts.code;
    this.serverMessage = opts.serverMessage;
    this.data = opts.data;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

// Server messages (and BE-12 codes) that mean the session itself is over.
// Other 401s, such as a wrong password, must not log anyone out.
const SESSION_ENDED: Record<string, SessionEndReason> = {
  'No token provided': 'expired',
  'Invalid token format': 'expired',
  'Invalid token': 'expired',
  'Token expired': 'expired',
  'Account no longer active': 'expired',
  'Your account was deactivated': 'deactivated',
  SESSION_EXPIRED: 'expired',
  ACCOUNT_DEACTIVATED: 'deactivated',
};

export type SessionEndReason = 'expired' | 'deactivated';

let sessionEndedHandler: ((reason: SessionEndReason) => void) | null = null;

/** The session provider registers its logout here. */
export function onSessionEnded(handler: ((reason: SessionEndReason) => void) | null) {
  sessionEndedHandler = handler;
}

export const http = axios.create({
  baseURL: `${brand.apiUrl}/api`,
  timeout: 15000, // U-10
});

http.interceptors.request.use(async config => {
  const token = await getToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  config.headers.set('Accept-Language', currentLang());
  return config;
});

function toApiError(error: unknown): ApiError {
  if (isApiError(error)) {
    return error;
  }
  const err = error as AxiosError<{message?: string; code?: string; meesage?: string}>;
  if (err?.isAxiosError) {
    if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
      return new ApiError('timeout');
    }
    if (!err.response) {
      return new ApiError('offline');
    }
    const body = err.response.data || {};
    return new ApiError('http', {
      status: err.response.status,
      code: body.code,
      serverMessage: body.message || body.meesage,
      data: body,
    });
  }
  return new ApiError('unknown', {serverMessage: (error as Error)?.message});
}

async function request<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const response = await http.request<T>(config);
    const body = response.data as unknown as {status?: string; message?: string; code?: string} | undefined;
    // A few old endpoints answer 200 with status: 'error'.
    if (body && typeof body === 'object' && body.status === 'error') {
      throw new ApiError('http', {status: response.status, code: body.code, serverMessage: body.message, data: body});
    }
    return response.data;
  } catch (error) {
    const apiError = toApiError(error);
    if (apiError.status === 401) {
      const reason =
        (apiError.code && SESSION_ENDED[apiError.code]) ||
        (apiError.serverMessage && SESSION_ENDED[apiError.serverMessage]);
      if (reason) {
        sessionEndedHandler?.(reason);
      }
    }
    throw apiError;
  }
}

type Params = Record<string, string | number | boolean | undefined | null>;

function cleanParams(params?: Params) {
  if (!params) {
    return undefined;
  }
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      out[key] = value;
    }
  }
  return out;
}

export const api = {
  get: <T>(url: string, params?: Params, config?: AxiosRequestConfig) =>
    request<T>({...config, method: 'GET', url, params: cleanParams(params)}),
  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    request<T>({...config, method: 'POST', url, data}),
  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    request<T>({...config, method: 'PUT', url, data}),
  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    request<T>({...config, method: 'PATCH', url, data}),
  delete: <T>(url: string, params?: Params, data?: unknown) =>
    request<T>({method: 'DELETE', url, params: cleanParams(params), data}),
  /**
   * Multipart upload with progress (0–1). At 1 the file is sent but the server
   * may still be storing it, so callers show "Finishing…" until this resolves.
   */
  upload: <T>(url: string, form: FormData, onProgress?: (fraction: number) => void, method: 'POST' | 'PUT' = 'POST') =>
    request<T>({
      method,
      url,
      data: form,
      headers: {'Content-Type': 'multipart/form-data'},
      timeout: 120000,
      transformRequest: value => value,
      onUploadProgress: event => {
        if (onProgress && event.total) {
          onProgress(Math.min(1, event.loaded / event.total));
        }
      },
    }),
};

/** A message safe to show the user for any error (never a stack or raw object). */
export function errorMessage(error: unknown, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const e = toApiError(error);
  switch (e.kind) {
    case 'offline':
      return t('errors.offline');
    case 'timeout':
      return t('errors.timeout');
    case 'http':
      if (e.status && e.status >= 500) {
        return t('errors.server');
      }
      return e.serverMessage || t('errors.unknown');
    default:
      return t('errors.unknown');
  }
}
