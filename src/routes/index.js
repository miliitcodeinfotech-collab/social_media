import express from "express";
import userRouter from './user.routes.js';
import postRouter from './post.routes.js';
import commentRouter from './comment.routes.js';
import memberRouter from './member.routes.js';
import profileRouter from './profile.routes.js';

const router = express.Router();

router.use("/users", userRouter);
router.use("/posts", postRouter);
router.use("/comments", commentRouter);
router.use("/members", memberRouter);
router.use("/profiles", profileRouter);

export default router;