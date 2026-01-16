import { Router } from "express";
import authenticateToken from "../middleware/authenticateToken";
import checkCommentExists from "../middleware/checkCommentExists";
import { getLikeStatusForComments } from "../middleware/getLikeStatus";
import { verifyCsrfToken } from "../middleware/verifyCsrfToken";
import { commentUpdateSchema, replyCreationSchema } from "../validators/comment";
import { deleteComment, likeComment, unlikeComment, updateComment } from "../controllers/commentsController";
import { createReply, getCommentReplies } from "../controllers/repliesController";

const router = Router();
 
router.patch('/:commentId', authenticateToken, verifyCsrfToken, commentUpdateSchema, updateComment);

router.delete('/:commentId', authenticateToken, verifyCsrfToken, deleteComment);

router.post('/:commentId/likes', authenticateToken, verifyCsrfToken, likeComment);

router.delete('/:commentId/likes', authenticateToken, verifyCsrfToken, unlikeComment);

router.get('/:commentId/likes/status', authenticateToken, checkCommentExists, getLikeStatusForComments);

// replies

router.get('/:commentId/replies', checkCommentExists, getCommentReplies);

router.post('/:commentId/replies', authenticateToken, verifyCsrfToken, replyCreationSchema, createReply);

export default router;