import crypto from "node:crypto"
import { Request, Response } from "express";

export const generateCsrfToken = (req: Request, res: Response) => {
    const key = crypto.randomBytes(24).toString("hex");

    const token = crypto
        .createHmac("sha256", key)
        .update("csrf-token")
        .digest('hex');

    // Store the secret in a secure, http-only cookie
    res.cookie("csrf_secret", key, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 15 * 60 * 1000 // 15 minutes
    });

    res.json({ csrfToken: token });
}
