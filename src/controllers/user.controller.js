import { User } from "../models/User.model.js";
import { Member } from "../models/member.model.js";


/**
 * Search users for mentions based on fullName or username
 * GET /api/v1/users/search-mention?q=query
 */
const searchUsersForMention = async (req, res) => {
    try {
        const { q } = req.query;

        if (!q) {
            return res.status(200).json({
                success: true,
                message: "No query provided, returning empty list",
                data: []
            });
        }

        // Case-insensitive search on firstname or lastname in Member model
        const members = await Member.find({
            $or: [
                { firstname: { $regex: q, $options: "i" } },
                { lastname: { $regex: q, $options: "i" } }
            ],
            isDeleted: false
        })
        .select("firstname lastname imageUrl _id") // Only return necessary fields
        .limit(10); // Limit results for better performance

        return res.status(200).json({
            success: true,
            message: members.length > 0 ? "Users found successfully" : "No users found",
            data: members
        });

    } catch (error) {
        console.error("Error in searchUsersForMention: ", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while searching for users",
            error: error.message
        });
    }
};

/**
 * Create a new user (for testing/registration)
 * POST /api/v1/users/create
 */
const createUser = async (req, res) => {
    try {
        const { fullName, username, email } = req.body;

        if (!fullName || !username || !email) {
            return res.status(400).json({
                success: false,
                message: "fullName, username, and email are required"
            });
        }

        const existedUser = await User.findOne({
            $or: [{ username }, { email }]
        });

        if (existedUser) {
            return res.status(409).json({
                success: false,
                message: "User with email or username already exists"
            });
        }

        const user = await User.create({
            fullName,
            username,
            email
        });

        return res.status(201).json({
            success: true,
            message: "User created successfully",
            data: user
        });
    } catch (error) {
        console.error("Error in createUser: ", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while creating user",
            error: error.message
        });
    }
};

export { searchUsersForMention, createUser };

