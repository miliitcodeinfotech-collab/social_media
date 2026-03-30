import { Router } from "express";
import { 
    getMemberProfile, 
    toggleFollow, 
    removeFollower, 
    getMemberFollowing, 
    getMemberFollowers, 
    getMutualFriends, 
    getSuggestions 
} from "../controllers/profile.controller.js";

const router = Router();

// Static endpoints must go BEFORE dynamic parameters (/:id)
router.route("/suggestions").get(getSuggestions);

// Dynamic Endpoints: /api/v1/profiles/:id...
router.route("/:id").get(getMemberProfile);
router.route("/:id/follow").post(toggleFollow);
router.route("/:id/remove-follower").post(removeFollower);
router.route("/:id/following").get(getMemberFollowing);
router.route("/:id/followers").get(getMemberFollowers);
router.route("/:id/mutual").get(getMutualFriends);

export default router;
