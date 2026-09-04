import { afterAll, beforeAll, expect } from "vitest";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createApp } from "../../src/app.ts";

const server = createServerSingleton();
let baseUrl = "";

function createServerSingleton(): Server {
  return createApp();
}

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error === undefined ? resolve() : reject(error)));
  });
});

/** Absolute base URL of the shared test server. */
export function url(path: string): string {
  return `${baseUrl}${path}`;
}

/** Issue a request against the shared test server. */
export function request(path: string, init?: RequestInit): Promise<Response> {
  return fetch(url(path), init);
}

export interface JsonApiResponse<T> {
  status: number;
  headers: Headers;
  body: T;
}

/** GET a JSON endpoint and return status, headers and parsed body. */
export async function getJson<T>(path: string): Promise<JsonApiResponse<T>> {
  const response = await request(path);
  const body = (await response.json()) as T;
  return { status: response.status, headers: response.headers, body };
}

/** POST a JSON payload and return status, headers and parsed body. */
export async function postJson<T>(
  path: string,
  payload: unknown,
  headers: Record<string, string> = { "Content-Type": "application/json" },
): Promise<JsonApiResponse<T>> {
  const response = await request(path, { method: "POST", body: bodyFor(payload), headers });
  const body = (await response.json()) as T;
  return { status: response.status, headers: response.headers, body };
}

function bodyFor(payload: unknown): BodyInit | undefined {
  if (typeof payload === "string") {
    return payload;
  }
  return payload === undefined ? undefined : JSON.stringify(payload);
}

/** Expectation helper: the standard error envelope. */
export interface ErrorEnvelope {
  error: { status: number; code: string; message: string; details?: { param: string }[] };
}

export async function expectApiError(
  path: string,
  status: number,
  code: string,
  init?: RequestInit,
): Promise<void> {
  const response = await request(path, init);
  expect(response.status).toBe(status);
  const body = (await response.json()) as ErrorEnvelope;
  expect(body.error.code).toBe(code);
  expect(body.error.status).toBe(status);
  expect(typeof body.error.message).toBe("string");
  expect(body.error.message.length).toBeGreaterThan(0);
}
