import { Router } from "express";
import { 
    getMemberProfile, 
    toggleFollow, 
    removeFollower, 
    getMemberFollowing, 
    getMemberFollowers, 
    getMutualFriends, 
    getSuggestions,
    getMemberAbout,
    updateMemberProfile,
    reportProfile,
    blockProfile,
    getShareConnections,
    shareProfile
} from "../controllers/profile.controller.js";

const router = Router();

// Static endpoints must go BEFORE dynamic parameters (/:id)
router.route("/suggestions").get(getSuggestions);
router.route("/update").patch(updateMemberProfile);
router.route("/share-connections").get(getShareConnections);

// Dynamic Endpoints: /api/v1/profiles/:id...
router.route("/:id").get(getMemberProfile);
router.route("/:id/follow").post(toggleFollow);
router.route("/:id/remove-follower").post(removeFollower);
router.route("/:id/following").get(getMemberFollowing);
router.route("/:id/followers").get(getMemberFollowers);
router.route("/:id/mutual").get(getMutualFriends);
router.route("/:id/about").get(getMemberAbout);
router.route("/:id/report").post(reportProfile);
router.route("/:id/block").post(blockProfile);
router.route("/:id/share").post(shareProfile);

export default router;
