import type { NextFunction, Request, Response } from "express";
import { isAdminRequest } from "./auth";

/** مسیرهایی که داده را تغییر می‌دهند فقط برای ادمین باز است. */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (await isAdminRequest(req)) {
    next();
    return;
  }
  res.status(401).json({ error: "برای این کار باید به‌عنوان ادمین وارد شوید." });
}
