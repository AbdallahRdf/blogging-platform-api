import rateLimit from "express-rate-limit";

// General limiter for all routes
export const globalRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    limit: Number(process.env.GLOBAL_RATE_LIMITER_MAX) || 100, // 100 requests per window per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: "Too many requests. Please wait and try again.",
    }
});

// Stricter limiter for login/register
export const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: Number(process.env.AUTH_RATE_LIMITER_MAX) || 10, // Only 10 requests per min
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: "Too many login attempts. Please wait and try again.",
    }
});

export const sendEmailRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    limit: Number(process.env.SEND_EMAIL_RATE_LIMITER_MAX) || 1,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: "Too many requests. Please wait and try again.",
    }
});