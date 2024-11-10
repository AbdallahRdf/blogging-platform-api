import { Router } from "express";
import { createPost, deletePost, getPost, getPosts, likeOrDislikePost, updatePost } from "../controllers/postsController.js";
import { createComment, deleteComment, getComment, getComments, likeOrDislikeComment, updateComment } from "../controllers/commentsController.js";
import authenticateToken from "../middleware/authenticateToken.js";
import { getPostSchema, postCreationSchema, postUpdateScema } from "../validation/postSchemas.js";
import { commentCreationSchema, commentUpdateSchema, replyUpdateSchema } from "../validation/commentSchema.js";
import { createCommentReply, deleteCommentReply, getCommentReplies, likeOrDislikeReply, updateCommentReply } from "../controllers/repliesController.js";
import authorizeRoles from "../middleware/authorizeRoles.js";
import { ROLES } from "../utils/enums.js";
import checkPostExists from "../middleware/checkPostExists.js";
import checkCommentExists from "../middleware/checkCommentExists.js";

const router = Router();

// posts

router.get('/', getPostSchema, getPosts);

router.get('/:postId', getPost);

router.post('/', authenticateToken, authorizeRoles(ROLES.ADMIN, ROLES.MODERATOR), postCreationSchema, createPost);

router.post('/:postId/like', authenticateToken, likeOrDislikePost);

router.patch('/:postId', authenticateToken, authorizeRoles(ROLES.ADMIN, ROLES.MODERATOR), postUpdateScema, updatePost);

router.delete('/:postId', authenticateToken, authorizeRoles(ROLES.ADMIN, ROLES.MODERATOR), deletePost);

// comments

router.get('/:postId/comments', checkPostExists, getComments);

router.get('/:postId/comments/:commentId', checkPostExists, checkCommentExists, getComment);

router.post('/:postId/comments', authenticateToken, commentCreationSchema, createComment);

router.post('/:postId/comments/:commentId/like', authenticateToken, checkPostExists, likeOrDislikeComment);

router.patch('/:postId/comments/:commentId', authenticateToken, commentUpdateSchema, checkPostExists, updateComment);

router.delete('/:postId/comments/:commentId', authenticateToken, deleteComment);

// replies

router.get('/:postId/comments/:commentId/replies', checkPostExists, checkCommentExists, getCommentReplies);

router.post('/:postId/comments/:commentId/replies', authenticateToken, commentUpdateSchema, createCommentReply);

router.post('/:postId/comments/:commentId/replies/:replyId/like', authenticateToken, checkPostExists, checkCommentExists, likeOrDislikeReply);

router.patch('/:postId/comments/:commentId/replies/:replyId', authenticateToken, replyUpdateSchema, checkPostExists, checkCommentExists, updateCommentReply);

router.delete('/:postId/comments/:commentId/replies/:replyId', authenticateToken, deleteCommentReply);

export default router;