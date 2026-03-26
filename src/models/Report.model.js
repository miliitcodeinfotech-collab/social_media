import mongoose, { Schema } from "mongoose";

const reportSchema = new Schema(
  {
    reportedBy: {
      type: Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },
    targetType: {
      type: String,
      enum: ["post", "comment", "Member"],
      required: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    reason: {
      type: String,
      enum: [
        "spam",
        "inappropriate",
        "impersonation",
        "false_information",
        "hate_speech",
        "violence",
        "other",
      ],
      required: true,
    },
    description: {
      type: String,
    },
    status: {
      type: String,
      enum: ["pending", "reviewed", "resolved", "rejected"],
      default: "pending",
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "Member",
    },
    reviewedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const Report = mongoose.model("Report", reportSchema);
