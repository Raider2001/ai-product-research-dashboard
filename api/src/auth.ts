import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { User } from "./models.js";

const TOKEN_TTL = "7d";

function secret() {
  return process.env.JWT_SECRET || "local-dev-only-change-me";
}

export function signToken(userId: string) {
  return jwt.sign({ sub: userId }, secret(), { expiresIn: TOKEN_TTL });
}

export async function requireUser(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token) {
    res.status(401).json({ error: "Log in to continue." });
    return;
  }

  try {
    const payload = jwt.verify(token, secret()) as { sub?: string };
    if (!payload.sub) {
      res.status(401).json({ error: "Log in to continue." });
      return;
    }

    const user = await User.findById(payload.sub).select("name email");
    if (!user) {
      res.status(401).json({ error: "Log in to continue." });
      return;
    }

    req.user = { id: user.id, name: user.name, email: user.email };
    next();
  } catch {
    res.status(401).json({ error: "Log in to continue." });
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; name: string; email: string };
    }
  }
}
