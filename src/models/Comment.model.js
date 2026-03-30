import mongoose, { Schema } from "mongoose";

const commentSchema = new Schema(
  {
    postId: {
      type: Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
    memberId: {
      type: Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },
    parentCommentId: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
    },
    text: {
      type: String,
      required: true,
    },
    mentions: [
      {
        type: Schema.Types.ObjectId,
        ref: "Member",
      },
    ],
    likesCount: {
      type: Number,
      default: 0,
    },
    likedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "Member",
      },
    ],
    repliesCount: {
      type: Number,
      default: 0,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster querying
commentSchema.index({ postId: 1, parentCommentId: 1, isDeleted: 1, createdAt: -1 });
commentSchema.index({ parentCommentId: 1, isDeleted: 1, createdAt: 1 });

export const Comment = mongoose.model("Comment", commentSchema);
