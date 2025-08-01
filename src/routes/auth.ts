import { Router } from 'express';
import { emailSchema, loginSchema, passwordSchema, signupSchema } from '../validators/auth';
import { handlePasswordReset, handleRefreshToken, login, logout, signup, updatePassword, validatePasswordResetToken } from '../controllers/authController.js';
import { authLimiter, sendEmailRateLimiter } from '../config/rateLimiter';
import checkRefreshToken from '../middleware/checkRefreshToken';

const router = Router();

router.post('/register', authLimiter, signupSchema, signup);

router.post('/login', authLimiter, loginSchema, login);

router.post('/logout', logout);

router.post('/refresh-token', checkRefreshToken, handleRefreshToken)

router.post('/forgot-password', sendEmailRateLimiter, emailSchema, handlePasswordReset);

router.get('/reset-password/verify', validatePasswordResetToken);

router.put('/reset-password', passwordSchema, updatePassword);

export default router;