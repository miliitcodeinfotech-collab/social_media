import { Post } from "../models/Post.model.js";
import { Share } from "../models/Share.model.js";
import "../models/member.model.js";
import { queueLikeAction } from "../services/like.service.js";

const createPost = async (req, res) => {
    try {
        const {
            memberId,
            caption,
            textBackground,
            mentions,
            media,
            location,
            visibility,
            societyId,
            allowComments,
            allowShares
        } = req.body;

        if (!memberId) {
            return res.status(400).json({
                success: false,
                message: "memberId is required to create a post"
            });
        }

        const newPost = new Post({
            memberId,
            caption: caption || "",
            textBackground: textBackground || { bgType: "none", value: "" },
            mentions: mentions || [],
            media: media || [],
            location: location || {},
            visibility: visibility || "public",
            societyId: societyId || "",
            status: req.body.status || "published", // NEW: Accept status from body
            allowComments: allowComments !== undefined ? allowComments : true,
            allowShares: allowShares !== undefined ? allowShares : true,
        });

        const savedPost = await newPost.save();

        return res.status(201).json({
            success: true,
            message: "Post created successfully",
            data: savedPost
        });

    } catch (error) {
        console.error("Error creating dynamic post: ", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while creating the post",
            error: error.message
        });
    }
};

const getAllPosts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const query = { isDeleted: false, status: "published" };

        const [posts, totalPosts] = await Promise.all([
            Post.find(query)
                .populate("memberId", "-password") // Populate user info but exclude password
                .populate("mentions", "-password") // Populate mentioned members
                .sort({ createdAt: -1 }) // Newest posts first
                .skip(skip)
                .limit(limit),
            Post.countDocuments(query)
        ]);

        const totalPages = Math.ceil(totalPosts / limit);

        return res.status(200).json({
            success: true,
            message: "Posts fetched successfully",
            count: posts.length,
            pagination: {
                totalPosts,
                totalPages,
                currentPage: page,
                limit
            },
            data: posts
        });
    } catch (error) {
        console.error("Error fetching posts: ", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while fetching posts",
            error: error.message
        });
    }
};

const saveDraft = async (req, res) => {
    try {
        const {
            memberId,
            caption,
            textBackground,
            mentions,
            media,
            location,
            societyId
        } = req.body;

        if (!memberId) {
            return res.status(400).json({
                success: false,
                message: "memberId is required to save a draft"
            });
        }

        const newDraft = new Post({
            memberId,
            caption: caption || "",
            textBackground: textBackground || { bgType: "none", value: "" },
            mentions: mentions || [],
            media: media || [],
            location: location || {},
            societyId: societyId || "",
            status: "draft",
        });

        const savedDraft = await newDraft.save();

        return res.status(201).json({
            success: true,
            message: "Draft saved successfully",
            data: savedDraft
        });
    } catch (error) {
        console.error("Error saving draft: ", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while saving the draft",
            error: error.message
        });
    }
};

const getMyDrafts = async (req, res) => {
    try {
        const memberId = req.headers['member-id'] || req.member?._id;

        if (!memberId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: Please provide 'member-id' in the request Headers."
            });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const query = {
            memberId: memberId,
            status: "draft",
            isDeleted: false
        };

        const [drafts, totalDrafts] = await Promise.all([
            Post.find(query)
                .populate("memberId", "fullName username avatar societyId")
                .sort({ updatedAt: -1 })
                .skip(skip)
                .limit(limit),
            Post.countDocuments(query)
        ]);

        const totalPages = Math.ceil(totalDrafts / limit);

        return res.status(200).json({
            success: true,
            message: "My drafts fetched successfully",
            count: drafts.length,
            pagination: {
                totalPosts: totalDrafts,
                totalPages,
                currentPage: page,
                limit
            },
            data: drafts
        });
    } catch (error) {
        console.error("Error fetching drafts: ", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while fetching drafts",
            error: error.message
        });
    }
};

const updateDraft = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            caption,
            textBackground,
            mentions,
            media,
            location,
            visibility,
            societyId,
            allowComments,
            allowShares
        } = req.body;

        const draft = await Post.findOne({ _id: id, status: "draft", isDeleted: false });

        if (!draft) {
            return res.status(404).json({
                success: false,
                message: "Draft not found or is already published"
            });
        }

        if (caption !== undefined) draft.caption = caption;
        if (textBackground !== undefined) draft.textBackground = textBackground;
        if (mentions !== undefined) draft.mentions = mentions;
        if (media !== undefined) draft.media = media;
        if (location !== undefined) draft.location = location;
        if (visibility !== undefined) draft.visibility = visibility;
        if (societyId !== undefined) draft.societyId = societyId;
        if (allowComments !== undefined) draft.allowComments = allowComments;
        if (allowShares !== undefined) draft.allowShares = allowShares;

        const updatedDraft = await draft.save();

        return res.status(200).json({
            success: true,
            message: "Draft updated successfully",
            data: updatedDraft
        });
    } catch (error) {
        console.error("Error updating draft: ", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while updating the draft",
            error: error.message
        });
    }
};

const deleteDraft = async (req, res) => {
    try {
        const { id } = req.params;

        const draft = await Post.findOne({ _id: id, status: "draft", isDeleted: false });

        if (!draft) {
            return res.status(404).json({
                success: false,
                message: "Draft not found"
            });
        }

        // Soft delete: keep the record but hide it
        draft.isDeleted = true;
        await draft.save();

        return res.status(200).json({
            success: true,
            message: "Draft deleted successfully"
        });
    } catch (error) {
        console.error("Error deleting draft: ", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while deleting the draft",
            error: error.message
        });
    }
};

const publishDraft = async (req, res) => {
    try {
        const { id } = req.params;

        const draft = await Post.findOne({ _id: id, status: "draft", isDeleted: false });

        if (!draft) {
            return res.status(404).json({
                success: false,
                message: "Draft not found or already published"
            });
        }

        draft.status = "published";
        draft.createdAt = new Date(); // Reset creation time to 'now' when publishing
        const publishedPost = await draft.save();

        return res.status(200).json({
            success: true,
            message: "Draft published successfully! It is now live in the feed.",
            data: publishedPost
        });
    } catch (error) {
        console.error("Error publishing draft: ", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while publishing the draft",
            error: error.message
        });
    }
};

const moveToDraft = async (req, res) => {
    try {
        const { id } = req.params;
        const currentUserId = req.headers['member-id'] || req.member?._id;

        const post = await Post.findOne({ _id: id, isDeleted: false });

        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Post not found"
            });
        }

        // Optional: Ensure only the owner can move to draft
        if (currentUserId && post.memberId.toString() !== currentUserId.toString()) {
            return res.status(403).json({
                success: false,
                message: "You can only move your own posts to draft"
            });
        }

        post.status = "draft";
        const draftPost = await post.save();

        return res.status(200).json({
            success: true,
            message: "Post moved to draft successfully",
            data: draftPost
        });
    } catch (error) {
        console.error("Error moving post to draft: ", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while moving to draft",
            error: error.message
        });
    }
};

const getPostById = async (req, res) => {
    try {
        const { id } = req.params;
        const post = await Post.findOne({ _id: id, isDeleted: false })
            .populate("memberId", "-password")
            .populate("mentions", "-password");

        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Post not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Post fetched successfully",
            data: post
        });
    } catch (error) {
        console.error("Error fetching single post: ", error);

        // Handle invalid ObjectId error
        if (error.kind === "ObjectId") {
            return res.status(400).json({
                success: false,
                message: "Invalid post ID format"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Internal server error while fetching the post",
            error: error.message
        });
    }
};

const updatePost = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            caption,
            textBackground,
            mentions,
            media,
            location,
            visibility,
            allowComments,
            allowShares
        } = req.body;

        const post = await Post.findOne({ _id: id, isDeleted: false });

        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Post not found"
            });
        }

        if (caption !== undefined) post.caption = caption;
        if (textBackground !== undefined) post.textBackground = textBackground;
        if (mentions !== undefined) post.mentions = mentions;
        if (media !== undefined) post.media = media;
        if (location !== undefined) post.location = location;
        if (visibility !== undefined) post.visibility = visibility;
        if (allowComments !== undefined) post.allowComments = allowComments;
        if (allowShares !== undefined) post.allowShares = allowShares;

        const updatedPost = await post.save();

        return res.status(200).json({
            success: true,
            message: "Post updated successfully",
            data: updatedPost
        });
    } catch (error) {
        console.error("Error updating post: ", error);

        if (error.kind === "ObjectId") {
            return res.status(400).json({
                success: false,
                message: "Invalid post ID format"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Internal server error while updating the post",
            error: error.message
        });
    }
};

const deletePost = async (req, res) => {
    try {
        const { id } = req.params;

        // Find the post first
        const post = await Post.findOne({ _id: id, isDeleted: false });

        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Post not found or already deleted"
            });
        }

        // We do a 'soft delete' to keep the record but hide it from the user
        post.isDeleted = true;
        await post.save();

        return res.status(200).json({
            success: true,
            message: "Post deleted successfully"
        });
    } catch (error) {
        console.error("Error deleting post: ", error);

        if (error.kind === "ObjectId") {
            return res.status(400).json({
                success: false,
                message: "Invalid post ID format"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Internal server error while deleting the post",
            error: error.message
        });
    }
};

const getMemberPosts = async (req, res) => {
    try {
        const { memberId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const query = { memberId: memberId, isDeleted: false, status: 'published' }; // Assuming they only want published posts

        const [posts, totalPosts] = await Promise.all([
            Post.find(query)
                .populate("memberId", "-password")
                .populate("mentions", "-password")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Post.countDocuments(query)
        ]);

        const totalPages = Math.ceil(totalPosts / limit);

        return res.status(200).json({
            success: true,
            message: "Member posts fetched successfully",
            count: posts.length,
            pagination: {
                totalPosts,
                totalPages,
                currentPage: page,
                limit
            },
            data: posts
        });
    } catch (error) {
        console.error("Error fetching user posts: ", error);

        if (error.kind === "ObjectId") {
            return res.status(400).json({
                success: false,
                message: "Invalid member ID format"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Internal server error while fetching user posts",
            error: error.message
        });
    }
};

const getMyPosts = async (req, res) => {
    try {
        // Temporarily taking from headers since proper auth middleware (JWT) is not set up yet
        const memberId = req.headers['member-id'] || req.member?._id;

        if (!memberId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: Please provide 'member-id' in the request Headers."
            });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const query = { memberId: memberId, isDeleted: false }; // Fetching drafts and published for 'my posts'

        const [posts, totalPosts] = await Promise.all([
            Post.find(query)
                .populate("memberId", "-password")
                .populate("mentions", "-password")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Post.countDocuments(query)
        ]);

        const totalPages = Math.ceil(totalPosts / limit);

        return res.status(200).json({
            success: true,
            message: "My posts fetched successfully",
            count: posts.length,
            pagination: {
                totalPosts,
                totalPages,
                currentPage: page,
                limit
            },
            data: posts
        });
    } catch (error) {
        console.error("Error fetching my posts: ", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while fetching my posts",
            error: error.message
        });
    }
};

const togglePostLike = async (req, res) => {
    try {
        const { postId } = req.params;
        const memberId = req.headers['member-id'] || req.body.memberId;

        if (!memberId) {
            return res.status(401).json({
                success: false,
                message: "memberId is required (Header or Body)"
            });
        }

        // 1. FAST READ: Only check if they liked it without downloading full array
        const post = await Post.findOne(
            { _id: postId, isDeleted: false },
            { likesCount: 1, likedBy: { $elemMatch: { $eq: memberId } } }
        );

        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Post not found"
            });
        }

        const isLiked = post.likedBy && post.likedBy.length > 0;

        // 2. ASYNCHRONOUS BACKGROUND WRITE: Protects Database from 1M concurrent inserts!
        if (isLiked) {
            queueLikeAction(postId, memberId, 'UNLIKE');
        } else {
            queueLikeAction(postId, memberId, 'LIKE');
        }

        // 3. INSTANT RESPONSE: We accurately calculate what the count *will* be.
        const predictedCount = isLiked
            ? Math.max(0, post.likesCount - 1)
            : post.likesCount + 1;

        // Response time is drastically reduced to < 30ms because we didn't block for DB Save!
        return res.status(200).json({
            success: true,
            message: isLiked ? "Post unliked successfully" : "Post liked successfully",
            isLiked: !isLiked,
            likesCount: predictedCount
        });

    } catch (error) {
        console.error("Error toggling post like: ", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while toggling like",
            error: error.message
        });
    }
};



const togglePostSave = async (req, res) => {
    try {
        const { postId } = req.params;
        const memberId = req.headers['member-id'] || req.body.memberId;

        if (!memberId) {
            return res.status(401).json({
                success: false,
                message: "memberId is required (Header or Body)"
            });
        }

        const post = await Post.findOne({ _id: postId, isDeleted: false });

        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Post not found"
            });
        }

        const isSaved = post.savedBy.includes(memberId);

        if (isSaved) {
            // Unsave logic
            post.savedBy = post.savedBy.filter(id => id.toString() !== memberId.toString());
            post.savesCount = Math.max(0, post.savesCount - 1);
        } else {
            // Save logic
            post.savedBy.push(memberId);
            post.savesCount += 1;
        }

        await post.save();

        return res.status(200).json({
            success: true,
            message: isSaved ? "Post unsaved successfully" : "Post saved successfully",
            isSaved: !isSaved,
            savesCount: post.savesCount
        });

    } catch (error) {
        console.error("Error toggling post save: ", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while toggling save",
            error: error.message
        });
    }
};

const getLikedPosts = async (req, res) => {
    try {
        const memberId = req.headers['member-id'] || req.member?._id;

        if (!memberId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: Please provide 'member-id' in the request Headers."
            });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const query = {
            likedBy: memberId,
            isDeleted: false
        };

        const [posts, totalPosts] = await Promise.all([
            Post.find(query)
                .populate("memberId", "-password")
                .populate("mentions", "-password")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Post.countDocuments(query)
        ]);

        const totalPages = Math.ceil(totalPosts / limit);

        return res.status(200).json({
            success: true,
            message: "Liked posts fetched successfully",
            count: posts.length,
            pagination: {
                totalPosts,
                totalPages,
                currentPage: page,
                limit
            },
            data: posts
        });
    } catch (error) {
        console.error("Error fetching liked posts: ", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while fetching liked posts",
            error: error.message
        });
    }
};

const getSavedPosts = async (req, res) => {
    try {
        const memberId = req.headers['member-id'] || req.member?._id;

        if (!memberId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: Please provide 'member-id' in the request Headers."
            });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const query = {
            savedBy: memberId,
            isDeleted: false
        };

        const [posts, totalPosts] = await Promise.all([
            Post.find(query)
                .populate("memberId", "-password")
                .populate("mentions", "-password")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Post.countDocuments(query)
        ]);

        const totalPages = Math.ceil(totalPosts / limit);

        return res.status(200).json({
            success: true,
            message: "Saved posts fetched successfully",
            count: posts.length,
            pagination: {
                totalPosts,
                totalPages,
                currentPage: page,
                limit
            },
            data: posts
        });
    } catch (error) {
        console.error("Error fetching saved posts: ", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while fetching saved posts",
            error: error.message
        });
    }
};

const getBackgrounds = async (req, res) => {
    try {
        const backgrounds = [
            { id: "1", type: "color", value: "#FF5733", name: "Orange Pop" },
            { id: "2", type: "color", value: "#33FF57", name: "Lime Green" },
            { id: "3", type: "color", value: "#3357FF", name: "Electric Blue" },
            { id: "4", type: "color", value: "#F333FF", name: "Magenta" },
            { id: "5", type: "gradient", value: "linear-gradient(45deg, #f3ec78, #af4261)", name: "Sunset" },
            { id: "6", type: "gradient", value: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", name: "Deep Purple" },
            { id: "7", type: "gradient", value: "linear-gradient(to right, #ff9966, #ff5e62)", name: "Peach" },
            { id: "8", type: "gradient", value: "linear-gradient(to right, #00c6ff, #0072ff)", name: "Skyline" },
            { id: "9", type: "image", value: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809", name: "Abstract Mesh" }
        ];

        return res.status(200).json({
            success: true,
            message: "Backgrounds fetched successfully",
            data: backgrounds
        });
    } catch (error) {
        console.error("Error fetching backgrounds: ", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while fetching backgrounds",
            error: error.message
        });
    }
};

const sharePost = async (req, res) => {
    try {
        const { postId } = req.params;
        const { senderId, receivers, shareType, externalPlatform } = req.body;

        if (!senderId) {
            return res.status(400).json({
                success: false,
                message: "senderId is required to share a post"
            });
        }

        const post = await Post.findOne({ _id: postId, isDeleted: false });

        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Post not found"
            });
        }

        // Create the share record
        const share = await Share.create({
            senderId,
            postId,
            receivers: receivers || [],
            shareType: shareType || "internal",
            externalPlatform: externalPlatform || ""
        });

        // Increment shares count on the post
        post.sharesCount += 1;
        await post.save();

        return res.status(201).json({
            success: true,
            message: "Post shared successfully",
            data: share
        });

    } catch (error) {
        console.error("Error sharing post: ", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while sharing the post",
            error: error.message
        });
    }
};

const getPostShares = async (req, res) => {
    try {
        const { postId } = req.params;

        const post = await Post.findOne({ _id: postId, isDeleted: false });

        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Post not found"
            });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const query = { postId: postId };

        const [shares, totalShares] = await Promise.all([
            Share.find(query)
                .populate("senderId", "fullName username avatar")
                .populate("receivers.memberId", "fullName username avatar")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Share.countDocuments(query)
        ]);

        const totalPages = Math.ceil(totalShares / limit);

        return res.status(200).json({
            success: true,
            message: "Post shares fetched successfully",
            count: shares.length,
            pagination: {
                totalShares,
                totalPages,
                currentPage: page,
                limit
            },
            data: shares
        });
    } catch (error) {
        console.error("Error fetching post shares: ", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while fetching shares",
            error: error.message
        });
    }
};

export {
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
};