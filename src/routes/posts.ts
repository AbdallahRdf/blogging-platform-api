import { Router } from "express";
import { createPost, deletePost, getPost, getPosts, likePost, unlikePost, updatePost } from "../controllers/postsController";
import { createComment, getComments, likeComment } from "../controllers/commentsController";
import authenticateToken from "../middleware/authenticateToken";
import { getPostsSchema, postCreationSchema, postUpdateSchema } from "../validators/post";
import { commentCreationSchema, getCommentsSchema } from "../validators/comment";
import authorizeRoles from "../middleware/authorizeRoles";
import { Roles } from "../enums/user.enums";
import checkPostExists from "../middleware/checkPostExists";
import { verifyCsrfToken } from "../middleware/verifyCsrfToken";
import { getLikeStatusForPosts } from "../middleware/getLikeStatus";

const router = Router();

// posts

router.get('/', getPostsSchema, getPosts);

router.get('/:postSlug', getPost);

router.get('/:postId/likes/status', authenticateToken, getLikeStatusForPosts);

router.post('/', authenticateToken, verifyCsrfToken, authorizeRoles(Roles.ADMIN, Roles.MODERATOR), postCreationSchema, createPost);

router.post('/:postId/likes', authenticateToken, verifyCsrfToken, likePost);

router.patch('/:postId', authenticateToken, verifyCsrfToken, authorizeRoles(Roles.ADMIN, Roles.MODERATOR), postUpdateSchema, updatePost);

router.delete('/:postId', authenticateToken, verifyCsrfToken, authorizeRoles(Roles.ADMIN, Roles.MODERATOR), deletePost);

router.delete('/:postId/likes', authenticateToken, verifyCsrfToken, unlikePost);

// comments

router.get('/:postId/comments', checkPostExists, getCommentsSchema, getComments);

router.post('/:postId/comments', authenticateToken, verifyCsrfToken, commentCreationSchema, createComment);

export default router;