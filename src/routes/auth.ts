import { Router } from 'express';
import { emailSchema, loginSchema, passwordSchema, signupSchema } from '../validators/auth';
import { handlePasswordReset, login, logout, signup, updatePassword, validatePasswordResetToken } from '../controllers/authController.js';
import authenticateToken from '../middleware/authenticateToken';

const router = Router();

router.post('/register', signupSchema, signup);

router.post('/login', loginSchema, login);

router.post('/logout', authenticateToken, logout);

router.post('/forgot-password', emailSchema, handlePasswordReset);

router.get('/reset-password/verify', validatePasswordResetToken);

router.put('/reset-password', passwordSchema, updatePassword);

export default router;