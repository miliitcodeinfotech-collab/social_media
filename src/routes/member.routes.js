import { Router } from "express";
import {
    createMember,
    getAllMembers,
    getMemberById
} from "../controllers/member.controller.js";

const router = Router();

router.route("/member").post(createMember).get(getAllMembers);
router.route("/:id").get(getMemberById);

export default router;
