
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_URI;

async function migrate() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("Connected to MongoDB for migration");

        const db = mongoose.connection.db;
        const postsCollection = db.collection("posts");

        // 1. Find posts with userId
        const postsWithUserId = await postsCollection.find({ userId: { $exists: true } }).toArray();
        console.log(`Found ${postsWithUserId.length} posts with userId field.`);

        if (postsWithUserId.length === 0) {
            console.log("No migration needed.");
            return;
        }

        // 2. Update them: set memberId = userId where memberId is missing, and unset userId
        let updatedCount = 0;
        for (const post of postsWithUserId) {
            const updateDoc = {
                $set: { memberId: post.memberId || post.userId },
                $unset: { userId: "" }
            };
            
            await postsCollection.updateOne({ _id: post._id }, updateDoc);
            updatedCount++;
        }

        console.log(`Successfully migrated ${updatedCount} posts.`);

    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        await mongoose.disconnect();
    }
}

migrate();
