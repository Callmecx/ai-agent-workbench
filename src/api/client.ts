import axios from 'axios';
import type { APIError, APIResponse } from '../types';
let token = '';
export const setAccessToken = (value: string) => { token = value; };
export const getAccessToken = () => token;
export function normalizeError(error: unknown): APIError {
  if (axios.isAxiosError(error)) { const body = error.response?.data as APIResponse<unknown> | undefined; return { code: body?.error?.code || (error.code === 'ECONNABORTED' ? 'TIMEOUT' : error.code === 'ERR_CANCELED' ? 'ABORTED' : 'NETWORK_ERROR'), message: body?.error?.message || (error.code === 'ECONNABORTED' ? 'Request timed out. Please retry.' : error.code === 'ERR_CANCELED' ? 'Request cancelled.' : 'Cannot reach the BFF. Check that the server is running.'), requestId: body?.requestId }; }
  if (error && typeof error === 'object' && 'code' in error && 'message' in error) return error as APIError;
  return { code: error instanceof DOMException && error.name === 'AbortError' ? 'ABORTED' : 'UNKNOWN_ERROR', message: error instanceof Error ? error.message : 'An unexpected error occurred.' };
}
export const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || '/api', timeout: 15000 });
api.interceptors.request.use((request) => { if (token) request.headers.Authorization = `Bearer ${token}`; return request; });
api.interceptors.response.use((response) => response, (error: unknown) => Promise.reject(normalizeError(error)));
export async function unwrap<T>(request: Promise<{ data: APIResponse<T> }>): Promise<T> { const response = (await request).data; if (!response.success) throw { ...response.error, requestId: response.requestId }; return response.data as T; }
