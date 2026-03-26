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
        ref: "User",
      },
    ],
    likesCount: {
      type: Number,
      default: 0,
    },
    likedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
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

export const Comment = mongoose.model("Comment", commentSchema);
