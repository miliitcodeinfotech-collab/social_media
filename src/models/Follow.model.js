import mongoose, { Schema } from "mongoose";

const followSchema = new Schema(
  {
    followerId: {
      type: Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },
    followingId: {
      type: Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    acceptedAt: {
      type: Date,
    },
    isUnfollowed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index on (followerId + followingId)
followSchema.index({ followerId: 1, followingId: 1 }, { unique: true });

export const Follow = mongoose.model("Follow", followSchema);
