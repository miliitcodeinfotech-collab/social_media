import mongoose, { Schema } from "mongoose";

const notificationSchema = new Schema(
  {
    memberId: {
      type: Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },
    type: {
      type: String,
      enum: ["like", "comment", "follow", "share", "mention", "report"],
      required: true,
    },
    referenceId: {
      type: Schema.Types.ObjectId,
    },
    fromMemberId: {
      type: Schema.Types.ObjectId,
      ref: "Member",
    },
    message: {
      type: String,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const Notification = mongoose.model("Notification", notificationSchema);
