import { Router } from "express";
import { changeUserRole, deleteUser, getUser, getUsers, updateUser } from "../controllers/userController.js";
import authenticateToken from "../middleware/authenticateToken.js";
import authorizeRoles from "../middleware/authorizeRoles.js";
import { Roles } from "../utils/enums.js";
import { changeUserRoleSchema, userUpdateSchema } from "../validation/userSchema.js";

const router = Router();

router.use(authenticateToken);

router.get('/', authorizeRoles(Roles.ADMIN, Roles.MODERATOR), getUsers);

router.get('/me', getUser);

router.get('/:userId', getUser);

router.patch('/me', userUpdateSchema, updateUser);

router.delete('/me', deleteUser);

router.delete('/:userId', authorizeRoles(Roles.ADMIN, Roles.MODERATOR), deleteUser);

router.post('/:userId/role', authorizeRoles(Roles.ADMIN), changeUserRoleSchema, changeUserRole);

export default router;