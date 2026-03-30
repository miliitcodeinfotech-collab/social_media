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

// Indexes to speed up followers and following list and count queries
followSchema.index({ followingId: 1, isUnfollowed: 1 });
followSchema.index({ followerId: 1, isUnfollowed: 1 });

export const Follow = mongoose.model("Follow", followSchema);
