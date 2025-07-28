import crypto from "node:crypto"
import { Request, Response, NextFunction } from "express";

export function verifyCsrfToken(req: Request, res: Response, next: NextFunction) {
    const csrfSecret = req.cookies["csrf_secret"];
    const csrfToken = req.headers["x-csrf-token"];

    if (!csrfSecret || !csrfToken || typeof csrfToken !== "string") {
        res.status(403).json({ error: "CSRF token missing or invalid." });
        return;
    }
    const expectedToken = crypto
        .createHmac("sha256", csrfSecret)
        .update("csrf-token")
        .digest("hex");

    if (csrfToken !== expectedToken) {
        res.status(403).json({ error: "Invalid CSRF token." });
        return;
    }

    next();
}
