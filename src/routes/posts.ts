import { Router } from "express";
import { createPost, deletePost, getPost, getPosts, likePost, unlikePost, updatePost } from "../controllers/postsController";
import { createComment, deleteComment, getComments, likeComment, updateComment } from "../controllers/commentsController";
import authenticateToken from "../middleware/authenticateToken";
import { getPostsSchema, postCreationSchema, postUpdateSchema } from "../validators/post";
import { commentCreationSchema, commentUpdateSchema, getCommentsSchema, replyCreationSchema, replyUpdateSchema } from "../validators/comment";
import { createNestedReply, createReply, deleteCommentReply, getCommentReplies, likeReply, updateReply } from "../controllers/repliesController";
import authorizeRoles from "../middleware/authorizeRoles";
import { Roles } from "../enums/user.enums";
import checkPostExists from "../middleware/checkPostExists";
import checkCommentExists from "../middleware/checkCommentExists";
import getLikeStatus from "../middleware/getLikeStatus";

const router = Router();

// posts

router.get('/', getPostsSchema, getPosts);

router.get('/:postSlug', getPost);

router.get('/:postId/likes/status', authenticateToken, getLikeStatus);

router.post('/', authenticateToken, authorizeRoles(Roles.ADMIN, Roles.MODERATOR), postCreationSchema, createPost);

router.post('/:postId/likes', authenticateToken, likePost);

router.patch('/:postId', authenticateToken, authorizeRoles(Roles.ADMIN, Roles.MODERATOR), postUpdateSchema, updatePost);

router.delete('/:postId', authenticateToken, authorizeRoles(Roles.ADMIN, Roles.MODERATOR), deletePost);

router.delete('/:postId/likes/', authenticateToken, authorizeRoles(Roles.ADMIN, Roles.MODERATOR), unlikePost);

// comments

router.get('/:postId/comments', checkPostExists, getCommentsSchema, getComments);

router.get('/:postId/comments/:commentId/likes/status', authenticateToken, checkPostExists, checkCommentExists, getLikeStatus);

router.post('/:postId/comments', authenticateToken, commentCreationSchema, createComment);

router.post('/:postId/comments/:commentId/likes', authenticateToken, checkPostExists, likeComment);

router.patch('/:postId/comments/:commentId', authenticateToken, commentUpdateSchema, checkPostExists, updateComment);

router.delete('/:postId/comments/:commentId', authenticateToken, deleteComment);

// replies

router.get('/:postId/comments/:commentId/replies', checkPostExists, checkCommentExists, getCommentReplies);

router.get('/:postId/comments/:commentId/replies/:replyId/likes/status', authenticateToken, checkPostExists, checkCommentExists, getLikeStatus);

router.post('/:postId/comments/:commentId/replies', authenticateToken, replyCreationSchema, createReply);

router.post('/:postId/comments/:commentId/replies/replyId', authenticateToken, replyCreationSchema, createNestedReply);

router.post('/:postId/comments/:commentId/replies/:replyId/likes', authenticateToken, checkPostExists, checkCommentExists, likeReply);

router.patch('/:postId/comments/:commentId/replies/:replyId', authenticateToken, replyUpdateSchema, checkPostExists, checkCommentExists, updateReply);

router.delete('/:postId/comments/:commentId/replies/:replyId', authenticateToken, deleteCommentReply);

export default router;