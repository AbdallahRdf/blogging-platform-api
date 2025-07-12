import { Router } from "express";
import postsRouter from "./posts";
import authRouter from "./auth";
import userRouter from "./user";

const router = Router();

router.use('/auth', authRouter);
router.use('/posts', postsRouter);
router.use('/users', userRouter);

export default router;