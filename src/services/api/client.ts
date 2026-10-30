/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Centralized API Client Wrapper
 * Handles timeouts, retries, error extraction, and status codes.
 */

export class ApiError extends Error {
  public status: number;
  public provider: string;
  public endpoint: string;

  constructor(message: string, status: number, provider: string, endpoint: string) {
    super(`[${provider}] (${status}) ${message}`);
    this.name = 'ApiError';
    this.status = status;
    this.provider = provider;
    this.endpoint = endpoint;
  }
}

interface FetchOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  provider?: string;
}

export async function fetchWithRetry<T>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const {
    timeoutMs = 12_000,
    retries = 2,
    provider = 'UnknownProvider',
    ...fetchInit
  } = options;

  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt <= retries) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...fetchInit,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorDetails = '';
        try {
          const jsonErr = await response.json();
          errorDetails = jsonErr.reason || jsonErr.message || JSON.stringify(jsonErr);
        } catch {
          errorDetails = response.statusText || 'HTTP Error';
        }

        // If rate-limited (429) or transient server error (502, 503, 504), wait and retry
        if ([429, 502, 503, 504].includes(response.status) && attempt < retries) {
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
          await new Promise((res) => setTimeout(res, delay));
          attempt++;
          continue;
        }

        throw new ApiError(errorDetails, response.status, provider, url);
      }

      const data = await response.json();
      return data as T;
    } catch (err: any) {
      clearTimeout(timeoutId);

      if (err.name === 'AbortError') {
        throw new ApiError(`Request timed out after ${timeoutMs}ms`, 408, provider, url);
      }

      if (err instanceof ApiError) {
        throw err;
      }

      lastError = err;
      if (attempt < retries) {
        const delay = Math.pow(2, attempt) * 800;
        await new Promise((res) => setTimeout(res, delay));
        attempt++;
        continue;
      }
      break;
    }
  }

  throw new ApiError(
    lastError?.message || 'Network connectivity error',
    0,
    provider,
    url
  );
}
