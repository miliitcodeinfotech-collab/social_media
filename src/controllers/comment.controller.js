import { Comment } from "../models/Comment.model.js";
import { Post } from "../models/Post.model.js";

const addComment = async (req, res) => {
    try {
        const { postId } = req.params;
        const { text, parentCommentId, mentions } = req.body;
        const memberId = req.headers['member-id'] || req.body.memberId;

        if (!memberId) {
            return res.status(401).json({
                success: false,
                message: "memberId is required (Header or Body)"
            });
        }

        if (!text) {
            return res.status(400).json({
                success: false,
                message: "Comment text is required"
            });
        }

        const post = await Post.findOne({ _id: postId, isDeleted: false });

        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Post not found"
            });
        }

        const newComment = new Comment({
            postId,
            memberId,
            text,
            parentCommentId: parentCommentId || null,
            mentions: mentions || []
        });

        const savedComment = await newComment.save();

        // Update comments count on the post
        post.commentsCount += 1;
        await post.save();

        // If it's a reply, increment repliesCount on the parent comment
        if (parentCommentId) {
            await Comment.findByIdAndUpdate(parentCommentId, {
                $inc: { repliesCount: 1 }
            });
        }

        return res.status(201).json({
            success: true,
            message: "Comment added successfully",
            data: savedComment
        });

    } catch (error) {
        console.error("Error adding comment: ", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while adding comment",
            error: error.message
        });
    }
};

const getPostComments = async (req, res) => {
    try {
        const { postId } = req.params;

        const comments = await Comment.find({
            postId,
            parentCommentId: null, // Only fetch top-level comments for now
            isDeleted: false
        })
            .populate("memberId", "-password")
            .populate("mentions", "-password")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            message: "Comments fetched successfully",
            count: comments.length,
            data: comments
        });

    } catch (error) {
        console.error("Error fetching comments: ", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while fetching comments",
            error: error.message
        });
    }
};

const updateComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const { text } = req.body;
        const memberId = req.headers['member-id'] || req.body.memberId;

        if (!memberId) {
            return res.status(401).json({
                success: false,
                message: "memberId is required (Header or Body)"
            });
        }

        if (!text) {
            return res.status(400).json({
                success: false,
                message: "Comment text is required for update"
            });
        }

        const comment = await Comment.findOne({ _id: commentId, isDeleted: false });

        if (!comment) {
            return res.status(404).json({
                success: false,
                message: "Comment not found"
            });
        }

        // Check if the user is the owner of the comment
        if (comment.memberId.toString() !== memberId.toString()) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized: You can only update your own comments"
            });
        }

        comment.text = text;
        const updatedComment = await comment.save();

        return res.status(200).json({
            success: true,
            message: "Comment updated successfully",
            data: updatedComment
        });

    } catch (error) {
        console.error("Error updating comment: ", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while updating comment",
            error: error.message
        });
    }
};

const deleteComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const memberId = req.headers['member-id'] || req.member?._id;

        if (!memberId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: Please provide 'member-id' in the request Headers."
            });
        }

        const comment = await Comment.findOne({ _id: commentId, isDeleted: false });

        if (!comment) {
            return res.status(404).json({
                success: false,
                message: "Comment not found or already deleted"
            });
        }

        // Check if the user is the owner of the comment
        if (comment.memberId.toString() !== memberId.toString()) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized: You can only delete your own comments"
            });
        }

        // Soft delete
        comment.isDeleted = true;
        await comment.save();

        // Update comments count on the post
        await Post.findByIdAndUpdate(comment.postId, {
            $inc: { commentsCount: -1 }
        });

        // If it's a reply, decrement repliesCount on the parent comment
        if (comment.parentCommentId) {
            await Comment.findByIdAndUpdate(comment.parentCommentId, {
                $inc: { repliesCount: -1 }
            });
        }

        return res.status(200).json({
            success: true,
            message: "Comment deleted successfully"
        });

    } catch (error) {
        console.error("Error deleting comment: ", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while deleting comment",
            error: error.message
        });
    }
};

const toggleCommentLike = async (req, res) => {
    try {
        const { commentId } = req.params;
        const memberId = req.headers['member-id'] || req.member?._id;

        if (!memberId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: Please provide 'member-id' in the request Headers."
            });
        }

        const comment = await Comment.findOne({ _id: commentId, isDeleted: false });

        if (!comment) {
            return res.status(404).json({
                success: false,
                message: "Comment not found"
            });
        }

        const isLiked = comment.likedBy.includes(memberId);

        if (isLiked) {
            // Unlike
            comment.likedBy = comment.likedBy.filter(id => id.toString() !== memberId.toString());
            comment.likesCount -= 1;
        } else {
            // Like
            comment.likedBy.push(memberId);
            comment.likesCount += 1;
        }

        await comment.save();

        return res.status(200).json({
            success: true,
            message: isLiked ? "Comment unliked successfully" : "Comment liked successfully",
            likesCount: comment.likesCount,
            isLiked: !isLiked
        });

    } catch (error) {
        console.error("Error toggling comment like: ", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while toggling comment like",
            error: error.message
        });
    }
};

const replyToComment = async (req, res) => {
    try {
        const { commentId } = req.params; // parentCommentId
        const { text, mentions } = req.body;
        const memberId = req.headers['member-id'] || req.member?._id;

        if (!memberId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: Please provide 'member-id' in the request Headers."
            });
        }

        if (!text) {
            return res.status(400).json({
                success: false,
                message: "Reply text is required"
            });
        }

        // Find parent comment to get postId
        const parentComment = await Comment.findOne({ _id: commentId, isDeleted: false });

        if (!parentComment) {
            return res.status(404).json({
                success: false,
                message: "Parent comment not found"
            });
        }

        const newReply = new Comment({
            postId: parentComment.postId,
            memberId,
            text,
            parentCommentId: commentId,
            mentions: mentions || []
        });

        const savedReply = await newReply.save();

        // Increment repliesCount on parent comment
        parentComment.repliesCount += 1;
        await parentComment.save();

        // Increment commentsCount on post
        await Post.findByIdAndUpdate(parentComment.postId, {
            $inc: { commentsCount: 1 }
        });

        return res.status(201).json({
            success: true,
            message: "Reply added successfully",
            data: savedReply
        });

    } catch (error) {
        console.error("Error replying to comment: ", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while replying to comment",
            error: error.message
        });
    }
};

const getCommentReplies = async (req, res) => {
    try {
        const { commentId } = req.params; // parentCommentId

        const replies = await Comment.find({
            parentCommentId: commentId,
            isDeleted: false
        })
            .populate("memberId", "-password")
            .populate("mentions", "-password")
            .sort({ createdAt: 1 }); // Usually oldest first for replies (chronological)

        return res.status(200).json({
            success: true,
            message: "Replies fetched successfully",
            count: replies.length,
            data: replies
        });

    } catch (error) {
        console.error("Error fetching replies: ", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while fetching replies",
            error: error.message
        });
    }
};

export {
    addComment,
    getPostComments,
    updateComment,
    deleteComment,
    toggleCommentLike,
    replyToComment,
    getCommentReplies
};
