import serverless from "serverless-http";
import { app } from "./src/app.js";
import connectDB from "./src/config/db.js";

// Ensure DB connects before handling requests inside lambda container
let dbInitialized = false;

const initDB = async () => {
  if (!dbInitialized) {
    await connectDB();
    dbInitialized = true;
  }
};

export const handler = async (event, context) => {
  // Prevent Lambda from waiting for MongoDB background connections to close
  context.callbackWaitsForEmptyEventLoop = false;

  await initDB();

  const serverlessApp = serverless(app);
  return await serverlessApp(event, context);
};

