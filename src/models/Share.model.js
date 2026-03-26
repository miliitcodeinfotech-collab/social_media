import mongoose, { Schema } from "mongoose";

const shareSchema = new Schema(
  {
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },
    postId: {
      type: Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
    receivers: [
      {
        memberId: {
          type: Schema.Types.ObjectId,
          ref: "Member",
        },
        message: {
          type: String,
        },
        isSeen: {
          type: Boolean,
          default: false,
        },
        seenAt: {
          type: Date,
        },
      },
    ],
    shareType: {
      type: String,
      enum: ["internal", "external"],
      default: "internal",
    },
    externalPlatform: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export const Share = mongoose.model("Share", shareSchema);
