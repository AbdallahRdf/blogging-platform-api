import { Router } from "express";
import { changeUserRole, deleteUser, getUser, getUsers, updateUser } from "../controllers/userController";
import authenticateToken from "../middleware/authenticateToken";
import authorizeRoles from "../middleware/authorizeRoles";
import { Roles } from "../enums/user.enums";
import { changeUserRoleSchema, userUpdateSchema } from "../validators/user";
import { verifyCsrfToken } from "../middleware/verifyCsrfToken";

const router = Router();

router.use(authenticateToken);

router.get('/', authorizeRoles(Roles.ADMIN, Roles.MODERATOR), getUsers);

router.get('/:username', getUser);

router.patch('/:username', verifyCsrfToken, userUpdateSchema, updateUser);

router.delete('/:username', verifyCsrfToken, deleteUser);

router.post('/:username/roles', verifyCsrfToken, authorizeRoles(Roles.ADMIN), changeUserRoleSchema, changeUserRole);

export default router;