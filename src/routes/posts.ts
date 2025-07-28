import { Router } from "express";
import { createPost, deletePost, getPost, getPosts, likePost, unlikePost, updatePost } from "../controllers/postsController";
import { createComment, deleteComment, getComments, likeComment, unlikeComment, updateComment } from "../controllers/commentsController";
import authenticateToken from "../middleware/authenticateToken";
import { getPostsSchema, postCreationSchema, postUpdateSchema } from "../validators/post";
import { commentCreationSchema, commentUpdateSchema, getCommentsSchema, replyCreationSchema, replyUpdateSchema } from "../validators/comment";
import { createReply, deleteCommentReply, getCommentReplies, likeReply, unlikeReply, updateReply } from "../controllers/repliesController";
import authorizeRoles from "../middleware/authorizeRoles";
import { Roles } from "../enums/user.enums";
import checkPostExists from "../middleware/checkPostExists";
import checkCommentExists from "../middleware/checkCommentExists";
import getLikeStatus from "../middleware/getLikeStatus";
import checkReplyExists from "../middleware/checkReplyExists";
import { verifyCsrfToken } from "../middleware/verifyCsrfToken";

const router = Router();

// posts

router.get('/', getPostsSchema, getPosts);

router.get('/:postSlug', getPost);

router.get('/:postId/likes/status', authenticateToken, getLikeStatus);

router.post('/', authenticateToken, verifyCsrfToken, authorizeRoles(Roles.ADMIN, Roles.MODERATOR), postCreationSchema, createPost);

router.post('/:postId/likes', authenticateToken, verifyCsrfToken, likePost);

router.patch('/:postId', authenticateToken, verifyCsrfToken, authorizeRoles(Roles.ADMIN, Roles.MODERATOR), postUpdateSchema, updatePost);

router.delete('/:postId', authenticateToken, verifyCsrfToken, authorizeRoles(Roles.ADMIN, Roles.MODERATOR), deletePost);

router.delete('/:postId/likes', authenticateToken, verifyCsrfToken, unlikePost);

// comments

router.get('/:postId/comments', checkPostExists, getCommentsSchema, getComments);

router.get('/:postId/comments/:commentId/likes/status', authenticateToken, checkPostExists, checkCommentExists, getLikeStatus);

router.post('/:postId/comments', authenticateToken, verifyCsrfToken, commentCreationSchema, createComment);

router.post('/:postId/comments/:commentId/likes', authenticateToken, verifyCsrfToken, checkPostExists, likeComment);

router.patch('/:postId/comments/:commentId', authenticateToken, verifyCsrfToken, commentUpdateSchema, checkPostExists, updateComment);

router.delete('/:postId/comments/:commentId', authenticateToken, verifyCsrfToken, deleteComment);

router.delete('/:postId/comments/:commentId/likes', authenticateToken, verifyCsrfToken, checkPostExists, unlikeComment);

// replies

router.get('/:postId/comments/:commentId/replies', checkPostExists, checkCommentExists, getCommentReplies);

router.get('/:postId/comments/:commentId/replies/:replyId/likes/status', authenticateToken, checkPostExists, checkCommentExists, checkReplyExists, getLikeStatus);

router.post('/:postId/comments/:commentId/replies', authenticateToken, verifyCsrfToken, replyCreationSchema, createReply);

router.post('/:postId/comments/:commentId/replies/:replyId/likes', authenticateToken, verifyCsrfToken, checkPostExists, checkCommentExists, likeReply);

router.patch('/:postId/comments/:commentId/replies/:replyId', authenticateToken, verifyCsrfToken, replyUpdateSchema, checkPostExists, checkCommentExists, updateReply);

router.delete('/:postId/comments/:commentId/replies/:replyId', authenticateToken, verifyCsrfToken, deleteCommentReply);

router.delete('/:postId/comments/:commentId/replies/:replyId/likes', authenticateToken, verifyCsrfToken, checkPostExists, checkCommentExists, unlikeReply);

export default router;