import { Router } from "express";
import postsRouter from "./posts.js";
import authRouter from "./auth.js";

const router = Router();

router.use('/auth', authRouter);
router.use('/posts', postsRouter);

export default router;