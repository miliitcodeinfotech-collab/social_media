import { Router } from "express";
import {
    addComment,
    getPostComments,
    updateComment,
    deleteComment,
    toggleCommentLike,
    replyToComment,
    getCommentReplies
} from "../controllers/comment.controller.js";

const router = Router();

// Routes for comments
router.route("/:postId").post(addComment).get(getPostComments);
router.route("/c/:commentId")
    .patch(updateComment)
    .delete(deleteComment);
router.route("/c/:commentId/like").post(toggleCommentLike);
router.route("/c/:commentId/reply").post(replyToComment);
router.route("/c/:commentId/replies").get(getCommentReplies);

export default router;
