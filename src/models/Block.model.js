import mongoose, { Schema } from "mongoose";

const blockSchema = new Schema(
  {
    blockerId: {
      type: Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },
    blockedId: {
      type: Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },
    reason: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index on (blockerId + blockedId)
blockSchema.index({ blockerId: 1, blockedId: 1 }, { unique: true });

export const Block = mongoose.model("Block", blockSchema);
