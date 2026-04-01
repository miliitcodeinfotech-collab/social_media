import { uploadOnCloudinary } from "../utils/cloudinary.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";


const uploadMedia = async (req, res) => {
    try {
        const localFilePath = req.file?.path;

        if (!localFilePath) {
            return res.status(400).json({
                success: false,
                message: "No file uploaded. Please provide a file in the 'media' field."
            });
        }

        /*
        const cloudinaryResponse = await uploadOnCloudinary(localFilePath);

        if (!cloudinaryResponse) {
            return res.status(500).json({
                success: false,
                message: "Internal server error during media upload to cloud"
            });
        }
        */

        return res.status(201).json({
            success: true,
            message: "Media saved LOCALLY successfully in src/temp (Cloudinary disabled)",
            data: {
                localPath: localFilePath,
                filename: req.file.filename,
                size: req.file.size,
                mimetype: req.file.mimetype,
                originalName: req.file.originalname
            }
        });
    } catch (error) {
        console.error("Error in uploadMedia controller: ", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error during media upload",
            error: error.message
        });
    }
};

const uploadMultipleMedia = async (req, res) => {
    try {
        const localFiles = req.files;

        if (!localFiles || localFiles.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No files uploaded. Please provide files in the 'media' field."
            });
        }

        const responseData = localFiles.map(file => ({
            localPath: file.path,
            filename: file.filename,
            size: file.size,
            mimetype: file.mimetype,
            originalName: file.originalname
        }));

        return res.status(201).json({
            success: true,
            message: `${localFiles.length} media files saved LOCALLY successfully in src/temp (Cloudinary disabled)`,
            data: responseData
        });
    } catch (error) {
        console.error("Error in uploadMultipleMedia controller: ", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error during multiple media upload",
            error: error.message
        });
    }
};

const deleteMedia = async (req, res) => {
    try {
        const { mediaId } = req.params;

        if (!mediaId) {
            return res.status(400).json({
                success: false,
                message: "Media ID (filename) is required"
            });
        }

        let tempPath;
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);

        // In AWS Lambda, __dirname starts with /var/task. We MUST use /tmp there.
        if (__dirname.startsWith('/var/task') || process.env.LAMBDA_TASK_ROOT || process.env.AWS_LAMBDA_FUNCTION_NAME) {
            tempPath = os.tmpdir(); // This will be /tmp in Lambda
        } else {
            tempPath = path.resolve(__dirname, "../temp");
        }
        
        const filePath = path.join(tempPath, mediaId);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: "Media file not found"
            });
        }

        fs.unlinkSync(filePath);

        return res.status(200).json({
            success: true,
            message: "Media deleted successfully from local storage"
        });
    } catch (error) {
        console.error("Error in deleteMedia controller: ", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error during media deletion",
            error: error.message
        });
    }
};

export { uploadMedia, uploadMultipleMedia, deleteMedia };

