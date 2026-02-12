import type { IncomingMessage, ServerResponse } from "node:http";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS";

export interface RouteContext {
  req: IncomingMessage;
  res: ServerResponse;
  url: URL;
  params: Record<string, string>;
  json: () => Promise<unknown>;
  sendJson: (status: number, body: unknown) => void;
  sendText: (status: number, body: string) => void;
}

export type RouteHandler = (ctx: RouteContext) => void | Promise<void>;

export interface ApiRoute {
  method: HttpMethod;
  path: string;
  handler: RouteHandler;
}

export interface XTimePlugin {
  name: string;
  configureServer?: (ctx: { port: number; rootDir: string }) => void | Promise<void>;
  onBuildStart?: () => void | Promise<void>;
  onBuildEnd?: () => void | Promise<void>;
}

export interface XTimeConfig {
  rootDir?: string;
  clientDir?: string;
  serverEntry?: string;
  outDir?: string;
  port?: number;
  plugins?: XTimePlugin[];
}
