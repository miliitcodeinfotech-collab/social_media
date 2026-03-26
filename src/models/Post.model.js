import mongoose, { Schema } from "mongoose";

const postSchema = new Schema(
  {
    memberId: {
      type: Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },
    caption: {
      type: String,
    },
    textBackground: {
      bgType: { type: String, enum: ["color", "image", "gradient", "none"], default: "none" },
      value: { type: String } // hex code, gradient string, or image URL
    },
    mentions: [
      {
        type: Schema.Types.ObjectId,
        ref: "Member"
      }
    ],
    media: [
      {
        url: { type: String },
        type: { type: String, enum: ["image", "video"] },
        thumbnail: { type: String },
      },
    ],
    location: {
      name: { type: String },
      lat: { type: Number },
      lng: { type: Number },
    },
    likesCount: {
      type: Number,
      default: 0,
    },
    commentsCount: {
      type: Number,
      default: 0,
    },
    sharesCount: {
      type: Number,
      default: 0,
    },
    savesCount: {
      type: Number,
      default: 0,
    },
    likedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "Member",
      },
    ],
    savedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "Member",
      },
    ],
    visibility: {
      type: String,
      enum: ["public", "residents", "Only Me"],
      default: "public",
    },
    isReported: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    allowComments: {
      type: Boolean,
      default: true,
    },
    allowShares: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ["published", "draft"],
      default: "published",
    },
    societyId: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Index for getAllPosts (filter by isDeleted, status and sort by createdAt)
postSchema.index({ isDeleted: 1, status: 1, createdAt: -1 });

// Index for member-specific queries (getMyPosts, getMemberPosts)
postSchema.index({ memberId: 1, isDeleted: 1, createdAt: -1 });

export const Post = mongoose.model("Post", postSchema);

