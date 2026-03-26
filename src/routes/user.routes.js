import { Router } from "express";
import { searchUsersForMention, createUser } from "../controllers/user.controller.js";

const router = Router();

// Route to search users for mentions
router.route("/search-mention").get(searchUsersForMention);

// Route to create a new user
router.route("/create").post(createUser);


export default router;
