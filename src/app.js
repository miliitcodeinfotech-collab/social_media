import express from "express";
import cors from "cors";
import helmet from "helmet";
import index from "./routes/index.js";

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true
}));

app.use(helmet());
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));


// Routes Declaration
app.use("/api/v1", index);

// Health check endpoint
app.get("/health", (req, res) => {
    res.status(200).json({ status: "OK", service: "Inout Social Backend" });
});

export { app };
