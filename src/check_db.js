import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "./models/User.model.js";

dotenv.config({ path: "./.env" });

const checkUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");

        const users = await User.find({}).select("fullName username").limit(10);
        console.log("Existing users in DB:");
        console.log(JSON.stringify(users, null, 2));

        const query = "mi"; // The query user used in Postman
        const searchResults = await User.find({
            $or: [
                { fullName: { $regex: query, $options: "i" } },
                { username: { $regex: query, $options: "i" } }
            ]
        }).select("fullName username");
        
        console.log(`Search results for query '${query}':`);
        console.log(JSON.stringify(searchResults, null, 2));

        await mongoose.disconnect();
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
};

checkUsers();
