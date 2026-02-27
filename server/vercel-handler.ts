import { createApp } from "./app";
import type { Express } from "express";

let app: Express | null = null;

export default async function handler(req: any, res: any) {
  if (!app) {
    app = await createApp();
  }
  return app(req, res);
}
