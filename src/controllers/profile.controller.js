import { Member } from "../models/member.model.js";
import { Follow } from "../models/Follow.model.js";
import { Post } from "../models/Post.model.js";
import { Report } from "../models/Report.model.js";
import { Block } from "../models/Block.model.js";
import { Share } from "../models/Share.model.js";
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
        const search = req.query.search || "";
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid ID format" });
        }

        let following;
        let total;

        if (search) {
            // Aggregation for search logic
            const aggregate = [
                { $match: { followerId: new mongoose.Types.ObjectId(id), isUnfollowed: false } },
                {
                    $lookup: {
                        from: "members", // Collection name is lowercase 'members'
                        localField: "followingId",
                        foreignField: "_id",
                        as: "memberDetails"
                    }
                },
                { $unwind: "$memberDetails" },
                {
                    $match: {
                        $or: [
                            { "memberDetails.firstname": { $regex: search, $options: "i" } },
                            { "memberDetails.lastname": { $regex: search, $options: "i" } }
                        ]
                    }
                },
                {
                    $facet: {
                        metadata: [{ $count: "total" }],
                        data: [
                            { $sort: { createdAt: -1 } },
                            { $skip: skip },
                            { $limit: limit },
                            {
                                $project: {
                                    _id: "$memberDetails._id",
                                    firstname: "$memberDetails.firstname",
                                    lastname: "$memberDetails.lastname",
                                    imageUrl: "$memberDetails.imageUrl",
                                    city: "$memberDetails.city"
                                }
                            }
                        ]
                    }
                }
            ];

            const result = await Follow.aggregate(aggregate);
            following = result[0].data;
            total = result[0].metadata[0]?.total || 0;
        } else {
            // Simple query for non-search (Faster performance)
            const query = { followerId: id, isUnfollowed: false };
            const [followingRecords, totalCount] = await Promise.all([
                Follow.find(query)
                    .populate("followingId", "firstname lastname imageUrl city")
                    .skip(skip)
                    .limit(limit)
                    .sort({ createdAt: -1 }),
                Follow.countDocuments(query)
            ]);
            following = followingRecords.map(f => f.followingId);
            total = totalCount;
        }

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
        const search = req.query.search || "";
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid ID format" });
        }

        let followers;
        let total;

        if (search) {
            const aggregate = [
                { $match: { followingId: new mongoose.Types.ObjectId(id), isUnfollowed: false } },
                {
                    $lookup: {
                        from: "members",
                        localField: "followerId",
                        foreignField: "_id",
                        as: "memberDetails"
                    }
                },
                { $unwind: "$memberDetails" },
                {
                    $match: {
                        $or: [
                            { "memberDetails.firstname": { $regex: search, $options: "i" } },
                            { "memberDetails.lastname": { $regex: search, $options: "i" } }
                        ]
                    }
                },
                {
                    $facet: {
                        metadata: [{ $count: "total" }],
                        data: [
                            { $sort: { createdAt: -1 } },
                            { $skip: skip },
                            { $limit: limit },
                            {
                                $project: {
                                    _id: "$memberDetails._id",
                                    firstname: "$memberDetails.firstname",
                                    lastname: "$memberDetails.lastname",
                                    imageUrl: "$memberDetails.imageUrl",
                                    city: "$memberDetails.city"
                                }
                            }
                        ]
                    }
                }
            ];

            const result = await Follow.aggregate(aggregate);
            followers = result[0].data;
            total = result[0].metadata[0]?.total || 0;
        } else {
            const query = { followingId: id, isUnfollowed: false };
            const [followerRecords, totalCount] = await Promise.all([
                Follow.find(query)
                    .populate("followerId", "firstname lastname imageUrl city")
                    .skip(skip)
                    .limit(limit)
                    .sort({ createdAt: -1 }),
                Follow.countDocuments(query)
            ]);
            followers = followerRecords.map(f => f.followerId);
            total = totalCount;
        }

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

// GET /api/v1/profiles/:id/about
export const getMemberAbout = async (req, res) => {
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

        // Fetch counts for the About page header (Matches Screenshot 7)
        const [postsCount, followersCount, followingCount] = await Promise.all([
            Post.countDocuments({ memberId: id, isDeleted: false, status: "published" }),
            Follow.countDocuments({ followingId: id, isUnfollowed: false }),
            Follow.countDocuments({ followerId: id, isUnfollowed: false })
        ]);

        return res.status(200).json({
            success: true,
            message: "Account details fetched successfully",
            data: {
                _id: member._id,
                name: `${member.firstname} ${member.lastname}`.trim(),
                imageUrl: member.imageUrl || "",
                stats: {
                    posts: postsCount,
                    followers: followersCount,
                    following: followingCount
                },
                details: {
                    dateJoined: member.createdAt,
                    location: member.city || "Not Specified"
                }
            }
        });
    } catch (error) {
        console.error("Error fetching account details: ", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while fetching account details",
            error: error.message
        });
    }
};

// PATCH /api/v1/profiles/update
export const updateMemberProfile = async (req, res) => {
    try {
        const currentMemberId = req.query.currentMemberId || req.query['member-id'] || req.headers['member-id'] || req.body.memberId;
        const { firstname, lastname, imageUrl, city } = req.body;

        if (!mongoose.Types.ObjectId.isValid(currentMemberId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid member ID"
            });
        }

        const updateData = {};
        if (firstname !== undefined) updateData.firstname = firstname;
        if (lastname !== undefined) updateData.lastname = lastname;
        if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
        if (city !== undefined) updateData.city = city;

        const updatedMember = await Member.findOneAndUpdate(
            { _id: currentMemberId, isDeleted: false },
            { $set: updateData },
            { new: true, runValidators: true }
        ).select("firstname lastname imageUrl city");

        if (!updatedMember) {
            return res.status(404).json({
                success: false,
                message: "Member not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: updatedMember
        });
    } catch (error) {
        console.error("Error updating profile: ", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while updating profile",
            error: error.message
        });
    }
};

// POST /api/v1/profiles/:id/report
export const reportProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const currentMemberId = req.query.currentMemberId || req.query['member-id'] || req.headers['member-id'] || req.body.memberId;
        const { reason, description } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(currentMemberId)) {
            return res.status(400).json({ success: false, message: "Invalid ID format" });
        }

        if (!reason) {
            return res.status(400).json({ success: false, message: "Reason is required to report a profile" });
        }

        const validReasons = ["spam", "inappropriate", "impersonation", "false_information", "hate_speech", "violence", "other"];
        if (!validReasons.includes(reason)) {
            return res.status(400).json({ success: false, message: "Invalid reason provided" });
        }

        const report = await Report.create({
            reportedBy: currentMemberId,
            targetType: "Member",
            targetId: id,
            reason,
            description: description || "",
            status: "pending"
        });

        return res.status(201).json({
            success: true,
            message: "Profile reported successfully",
            data: report
        });
    } catch (error) {
        console.error("Error reporting profile: ", error);
        return res.status(500).json({ success: false, message: "Internal server error while reporting", error: error.message });
    }
};

// POST /api/v1/profiles/:id/block
export const blockProfile = async (req, res) => {
    try {
        const { id } = req.params; // ID of the member to be blocked
        const currentMemberId = req.query.currentMemberId || req.query['member-id'] || req.headers['member-id'] || req.body.memberId;

        if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(currentMemberId)) {
            return res.status(400).json({ success: false, message: "Invalid ID format" });
        }

        if (id === currentMemberId) {
            return res.status(400).json({ success: false, message: "You cannot block yourself" });
        }

        // Check if block already exists
        const existingBlock = await Block.findOne({ blockerId: currentMemberId, blockedId: id });
        if (existingBlock) {
             if (existingBlock.isActive) {
                 return res.status(400).json({ success: false, message: "Profile is already blocked" });
             } else {
                 existingBlock.isActive = true;
                 await existingBlock.save();
             }
        } else {
             await Block.create({ blockerId: currentMemberId, blockedId: id, isActive: true });
        }

        // Unfollow bi-directionally
        await Follow.updateMany(
            {
                $or: [
                    { followerId: currentMemberId, followingId: id, isUnfollowed: false },
                    { followerId: id, followingId: currentMemberId, isUnfollowed: false }
                ]
            },
            { $set: { isUnfollowed: true } }
        );

        return res.status(200).json({
            success: true,
            message: "Profile blocked successfully limit interactions"
        });
    } catch (error) {
        console.error("Error blocking profile: ", error);
        return res.status(500).json({ success: false, message: "Internal server error while blocking", error: error.message });
    }
};

// GET /api/v1/profiles/share-connections
// Gets a list of members the current member is visually following (to use for sending shares)
export const getShareConnections = async (req, res) => {
    try {
        const currentMemberId = req.query.currentMemberId || req.query['member-id'] || req.headers['member-id'];
        const search = req.query.search || "";
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        if (!mongoose.Types.ObjectId.isValid(currentMemberId)) {
            return res.status(400).json({ success: false, message: "Invalid member ID" });
        }

        // We specifically want to fetch the users that the current user is FOLLOWING
        const followersAggregate = [
            { $match: { followerId: new mongoose.Types.ObjectId(currentMemberId), isUnfollowed: false } },
            {
                $lookup: {
                    from: "members", // Ensure collection is 'members'
                    localField: "followingId",
                    foreignField: "_id",
                    as: "memberDetails",
                },
            },
            { $unwind: "$memberDetails" },
        ];

        // Ensure we handle text searching elegantly if ?search is passed
        if (search) {
            followersAggregate.push({
                $match: {
                    $or: [
                        { "memberDetails.firstname": { $regex: search, $options: "i" } },
                        { "memberDetails.lastname": { $regex: search, $options: "i" } }
                    ]
                }
            });
        }

        followersAggregate.push(
            {
                $facet: {
                    metadata: [{ $count: "total" }],
                    data: [
                        { $sort: { createdAt: -1 } },
                        { $skip: skip },
                        { $limit: limit },
                        {
                            $project: {
                                _id: "$memberDetails._id",
                                firstname: "$memberDetails.firstname",
                                lastname: "$memberDetails.lastname",
                                imageUrl: "$memberDetails.imageUrl",
                            },
                        },
                    ],
                },
            }
        );

        const result = await Follow.aggregate(followersAggregate);
        const connections = result[0].data || [];
        const total = result[0].metadata[0]?.total || 0;

        return res.status(200).json({
            success: true,
            message: "Share connections fetched successfully",
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
            data: connections
        });

    } catch (error) {
        console.error("Error fetching share connections: ", error);
        return res.status(500).json({ success: false, message: "Internal error", error: error.message });
    }
};

// POST /api/v1/profiles/:id/share
export const shareProfile = async (req, res) => {
    try {
        const { id } = req.params; // Profile ID to share
        const currentMemberId = req.query.currentMemberId || req.query['member-id'] || req.headers['member-id'] || req.body.memberId;
        const { targetIds, message } = req.body; // Array of member IDs to send to

        if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(currentMemberId)) {
            return res.status(400).json({ success: false, message: "Invalid ID format" });
        }
        
        if (!targetIds || !Array.isArray(targetIds) || targetIds.length === 0) {
            return res.status(400).json({ success: false, message: "targetIds array is required to share" });
        }

        // Validate that we are sharing an existing profile
        const profileExistence = await Member.findById(id);
        if (!profileExistence) {
            return res.status(404).json({ success: false, message: "The profile you are trying to share does not exist" });
        }

        const receivers = targetIds.map(targetId => ({
            memberId: targetId,
            message: message || ""
        }));

        const sharedDoc = await Share.create({
            senderId: currentMemberId,
            sharedProfileId: id,
            receivers: receivers,
            shareType: "internal"
        });

        return res.status(200).json({
            success: true,
            message: "Profile shared successfully",
            data: sharedDoc
        });
    } catch (error) {
         console.error("Error sharing profile: ", error);
         return res.status(500).json({ success: false, message: "Internal server error while sharing", error: error.message });
    }
};
