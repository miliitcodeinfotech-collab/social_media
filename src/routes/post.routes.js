import { Router } from "express";
import {
    createPost,
    getAllPosts,
    getPostById,
    updatePost,
    deletePost,
    getMemberPosts,
    getMyPosts,
    togglePostLike,
    togglePostSave,
    getLikedPosts,
    getSavedPosts,
    saveDraft,
    moveToDraft,
    getMyDrafts,
    updateDraft,
    deleteDraft,
    publishDraft,
    getBackgrounds,
    sharePost,
    getPostShares
} from "../controllers/post.controller.js";



import { uploadMedia, uploadMultipleMedia, deleteMedia } from "../controllers/media.controller.js";

import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.route("/backgrounds").get(getBackgrounds);


router.route("/liked").get(getLikedPosts);
router.route("/saved").get(getSavedPosts);
router.route("/drafts").get(getMyDrafts);
router.route("/draft").post(saveDraft);

// Draft management routes
router.route("/draft/:id")
    .patch(moveToDraft)
    .put(updateDraft)
    .delete(deleteDraft);

router.route("/draft/:id/publish").post(publishDraft);

// Media Upload Routes
router.route("/media/upload").post(upload.single("media"), uploadMedia);
router.route("/media/upload/multiple").post(upload.array("media", 10), uploadMultipleMedia);
router.route("/media/:mediaId").delete(deleteMedia);


// General Post routes
router.route("/").post(createPost).get(getAllPosts);
router.route("/me").get(getMyPosts);
router.route("/member/:memberId").get(getMemberPosts);
router.route("/:id").get(getPostById).patch(updatePost).delete(deletePost);
router.route("/:postId/like").post(togglePostLike);
router.route("/:postId/save").post(togglePostSave);
router.route("/:postId/share").post(sharePost);
router.route("/:postId/shares").get(getPostShares);



export default router;
