import { Router } from "express";
import postsRouter from "./posts";
import authRouter from "./auth";
import userRouter from "./user";
import { generateCsrfToken } from "../controllers/csrfController";

const router = Router();

router.get('/csrf-token', generateCsrfToken);

router.use('/auth', authRouter);
router.use('/posts', postsRouter);
router.use('/users', userRouter);

export default router;