import type { NextApiRequest, NextApiResponse } from "next";
import { getExpressApp } from "@/server/app";

/**
 * پل میان Next.js و Express.
 * مسیرهای Pages API اشیای خام Node را می‌دهند، پس Express بدون هیچ آداپتوری
 * می‌تواند مستقیم آن‌ها را مدیریت کند — هم در توسعه و هم روی توابع ورسل.
 */
export const config = {
  api: {
    // خواندن بدنه بر عهده‌ی express.json و express.raw است.
    bodyParser: false,
    externalResolver: true,
    responseLimit: false,
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return getExpressApp()(req, res);
}
