import { Router } from "express";
import authenticateToken from "../middleware/authenticateToken";
import { getLikeStatusForComments } from "../middleware/getLikeStatus";
import { verifyCsrfToken } from "../middleware/verifyCsrfToken";
import { replyUpdateSchema } from "../validators/comment";
import { deleteCommentReply, likeReply, unlikeReply, updateReply } from "../controllers/repliesController";
import checkReplyExists from "../middleware/checkReplyExists";

const router = Router();

router.patch('/:replyId', authenticateToken, verifyCsrfToken, replyUpdateSchema, updateReply);

router.delete('/:replyId', authenticateToken, verifyCsrfToken, deleteCommentReply);

router.delete('/:replyId/likes', authenticateToken, verifyCsrfToken, unlikeReply);

router.post('/:replyId/likes', authenticateToken, verifyCsrfToken, likeReply);

router.get('/:replyId/likes/status', authenticateToken, checkReplyExists, getLikeStatusForComments);

export default router;