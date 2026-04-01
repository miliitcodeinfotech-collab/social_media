
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_URI;

async function checkValidMembers() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("Connected to MongoDB");

        const db = mongoose.connection.db;
        const postsCollection = db.collection("posts");
        const membersCollection = db.collection("members");

        const posts = await postsCollection.find({}).toArray();
        console.log(`Total posts: ${posts.length}`);

        for (const post of posts) {
            if (post.memberId) {
                const member = await membersCollection.findOne({ _id: post.memberId });
                if (!member) {
                    console.log(`Post ${post._id} has invalid memberId: ${post.memberId}`);
                }
            } else {
                console.log(`Post ${post._id} has NO memberId`);
            }
        }

    } catch (error) {
        console.error("Check failed:", error);
    } finally {
        await mongoose.disconnect();
    }
}

checkValidMembers();
