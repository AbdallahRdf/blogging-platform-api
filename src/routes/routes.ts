import { Router } from "express";
import postsRouter from "./posts";
import authRouter from "./auth";
import userRouter from "./user";
import commentsRouter from "./comments";
import repliesRouter from "./replies";
import { generateCsrfToken } from "../controllers/csrfController";

const router = Router();

router.get('/csrf-token', generateCsrfToken);

router.use('/auth', authRouter);
router.use('/posts', postsRouter);
router.use('/comments', commentsRouter);
router.use('/replies', repliesRouter);
router.use('/users', userRouter);

export default router;