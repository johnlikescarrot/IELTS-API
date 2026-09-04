/**
 * Shared test fixtures: an ephemeral app instance plus typed fetch helpers.
 */

import type { Server } from "node:http";
import { createApp } from "../src/server.js";
import type { Route } from "../src/router.js";

export interface Fixture {
  readonly server: Server;
  readonly baseUrl: string;
}

export interface HttpResponse {
  readonly status: number;
  readonly headers: Headers;
  readonly body: unknown;
}

export async function startFixture(
  extraRoutes?: readonly Route[],
): Promise<Fixture> {
  const server = createApp(extraRoutes).listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => {
    server.once("listening", resolve);
  });
  const address = server.address();
  const port =
    typeof address === "object" && address !== null ? address.port : 0;
  return { server, baseUrl: `http://127.0.0.1:${port}` };
}

export async function stopFixture(fixture: Fixture): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    fixture.server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

export async function request(
  fixture: Fixture,
  path: string,
  init?: RequestInit,
): Promise<HttpResponse> {
  const response = await fetch(`${fixture.baseUrl}${path}`, init);
  const text = await response.text();
  const contentType = response.headers.get("content-type") ?? "";
  const body: unknown =
    contentType.includes("application/json") && text.length > 0
      ? JSON.parse(text)
      : text;
  return { status: response.status, headers: response.headers, body };
}

export function get(fixture: Fixture, path: string): Promise<HttpResponse> {
  return request(fixture, path);
}

export function post(
  fixture: Fixture,
  path: string,
  payload: string,
): Promise<HttpResponse> {
  return request(fixture, path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: payload,
  });
}

export function as<T>(value: unknown): T {
  return value as T;
}
