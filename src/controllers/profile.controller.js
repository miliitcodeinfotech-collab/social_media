import { Member } from "../models/member.model.js";
import { Follow } from "../models/Follow.model.js";
import { Post } from "../models/Post.model.js";
import mongoose from "mongoose";

// GET /api/v1/profiles/:id
export const getMemberProfile = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid member ID format"
            });
        }

        const member = await Member.findOne({ _id: id, isDeleted: false })
            .select("firstname lastname imageUrl city createdAt");

        if (!member) {
            return res.status(404).json({
                success: false,
                message: "Member not found"
            });
        }

        // Fetch counts for the profile
        const [postsCount, followersCount, followingCount] = await Promise.all([
            Post.countDocuments({ memberId: id, isDeleted: false, status: "published" }),
            Follow.countDocuments({ followingId: id, isUnfollowed: false }),
            Follow.countDocuments({ followerId: id, isUnfollowed: false })
        ]);

        return res.status(200).json({
            success: true,
            message: "Member profile fetched successfully",
            data: {
                _id: member._id,
                name: `${member.firstname} ${member.lastname}`.trim(),
                imageUrl: member.imageUrl || "",
                city: member.city || "",
                dateJoined: member.createdAt,
                counters: {
                    posts: postsCount,
                    followers: followersCount,
                    following: followingCount
                }
            }
        });
    } catch (error) {
        console.error("Error fetching member profile: ", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while fetching member profile",
            error: error.message
        });
    }
};

// POST /api/v1/profiles/:id/follow
export const toggleFollow = async (req, res) => {
    try {
        const { id } = req.params;
        const currentMemberId = req.query.currentMemberId || req.query['member-id'] || req.headers['member-id'] || req.body.memberId; // Flexible assignment

        if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(currentMemberId)) {
            return res.status(400).json({
                success: false, 
                message: "Invalid member ID format" 
            });
        }

        if (id === currentMemberId) {
            return res.status(400).json({ 
                success: false, 
                message: "You cannot follow yourself" 
            });
        }

        // Verify the member to follow actually exists
        const memberToFollow = await Member.findOne({ _id: id, isDeleted: false });
        if (!memberToFollow) {
            return res.status(404).json({
                success: false,
                message: "Member not found"
            });
        }

        const existingFollow = await Follow.findOne({ 
            followerId: currentMemberId, 
            followingId: id 
        });

        let isFollowing;
        if (existingFollow) {
            existingFollow.isUnfollowed = !existingFollow.isUnfollowed;
            await existingFollow.save();
            isFollowing = !existingFollow.isUnfollowed;
        } else {
            await Follow.create({ 
                followerId: currentMemberId, 
                followingId: id, 
                isUnfollowed: false 
            });
            isFollowing = true;
        }

        return res.status(200).json({ 
            success: true, 
            message: isFollowing ? "Successfully followed" : "Successfully unfollowed", 
            data: { isFollowing } 
        });
    } catch (error) {
        console.error("Error toggling follow status: ", error);
        return res.status(500).json({ 
            success: false, 
            message: "Internal server error while toggling follow status", 
            error: error.message 
        });
    }
};

// POST /api/v1/profiles/:id/remove-follower
export const removeFollower = async (req, res) => {
    try {
        const { id } = req.params; // ID of the user we want to remove from our followers list
        const currentMemberId = req.query.currentMemberId || req.query['member-id'] || req.headers['member-id'] || req.body.memberId;

        if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(currentMemberId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid member ID format"
            });
        }

        // Search for the follow record where 'id' is following 'currentMemberId'
        const followRecord = await Follow.findOne({
            followerId: id,
            followingId: currentMemberId,
            isUnfollowed: false
        });

        if (!followRecord) {
            return res.status(404).json({
                success: false,
                message: "Follower not found or already removed"
            });
        }

        followRecord.isUnfollowed = true;
        await followRecord.save();

        return res.status(200).json({
            success: true,
            message: "Follower removed successfully"
        });
    } catch (error) {
        console.error("Error removing follower: ", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while removing follower",
            error: error.message
        });
    }
};

// GET /api/v1/profiles/:id/following
export const getMemberFollowing = async (req, res) => {
    try {
        const { id } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid ID format" });
        }

        const query = { followerId: id, isUnfollowed: false };
        
        const [followingRecords, total] = await Promise.all([
            Follow.find(query)
                .populate("followingId", "firstname lastname imageUrl city")
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            Follow.countDocuments(query)
        ]);

        // Extracting member details from populated records
        const following = followingRecords.map(f => f.followingId);

        return res.status(200).json({
            success: true,
            message: "Following list fetched successfully",
            pagination: { 
                total, 
                page, 
                limit, 
                totalPages: Math.ceil(total / limit) 
            },
            data: following
        });
    } catch (error) {
        console.error("Error fetching following list: ", error);
        return res.status(500).json({ 
            success: false, 
            message: "Internal server error while fetching following list", 
            error: error.message 
        });
    }
};

// GET /api/v1/profiles/:id/followers
export const getMemberFollowers = async (req, res) => {
    try {
        const { id } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid ID format" });
        }

        const query = { followingId: id, isUnfollowed: false };
        
        const [followerRecords, total] = await Promise.all([
            Follow.find(query)
                .populate("followerId", "firstname lastname imageUrl city")
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            Follow.countDocuments(query)
        ]);

        const followers = followerRecords.map(f => f.followerId);

        return res.status(200).json({
            success: true,
            message: "Followers list fetched successfully",
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
            data: followers
        });
    } catch (error) {
        console.error("Error fetching followers list: ", error);
        return res.status(500).json({ success: false, message: "Internal server error", error: error.message });
    }
};

// GET /api/v1/profiles/:id/mutual
export const getMutualFriends = async (req, res) => {
    try {
        const { id } = req.params; // The other user's ID
        const currentMemberId = req.query.currentMemberId || req.query['member-id'] || req.headers['member-id'];

        if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(currentMemberId)) {
            return res.status(400).json({ success: false, message: "Invalid IDs" });
        }

        const [myFollowing, userFollowers] = await Promise.all([
            Follow.find({ followerId: currentMemberId, isUnfollowed: false }).distinct("followingId"),
            Follow.find({ followingId: id, isUnfollowed: false }).distinct("followerId")
        ]);

        const myFollowingSet = new Set(myFollowing.map(oid => oid.toString()));
        const mutualIds = userFollowers.filter(oid => myFollowingSet.has(oid.toString()));

        const mutualFriends = await Member.find({ _id: { $in: mutualIds }, isDeleted: false })
            .select("firstname lastname imageUrl city");

        return res.status(200).json({ 
            success: true, 
             message: "Mutual friends fetched successfully",
            count: mutualFriends.length, 
            data: mutualFriends 
        });
    } catch (error) {
        console.error("Error fetching mutual friends: ", error);
        return res.status(500).json({ success: false, message: "Internal server error", error: error.message });
    }
};

// GET /api/v1/profiles/suggestions
export const getSuggestions = async (req, res) => {
    try {
        const currentMemberId = req.query.currentMemberId || req.query['member-id'] || req.headers['member-id'];
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        if (!mongoose.Types.ObjectId.isValid(currentMemberId)) {
             return res.status(400).json({ success: false, message: "Invalid member ID" });
        }

        const followedIds = await Follow.find({ followerId: currentMemberId, isUnfollowed: false }).distinct("followingId");
        followedIds.push(currentMemberId);

        const query = { _id: { $nin: followedIds }, isDeleted: false };
        const [suggestions, total] = await Promise.all([
            Member.find(query).select("firstname lastname imageUrl city").skip(skip).limit(limit).sort({ createdAt: -1 }),
            Member.countDocuments(query)
        ]);

        return res.status(200).json({
            success: true,
             message: "Suggestions fetched successfully",
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
            data: suggestions
        });
    } catch (error) {
        console.error("Error fetching suggestions: ", error);
        return res.status(500).json({ success: false, message: "Internal server error", error: error.message });
    }
};
