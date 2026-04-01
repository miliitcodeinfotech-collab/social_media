import multer from "multer";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";

import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let tempPath;

    // In AWS Lambda, __dirname starts with /var/task. We MUST use /tmp there.
    if (__dirname.startsWith('/var/task') || process.env.LAMBDA_TASK_ROOT || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      tempPath = os.tmpdir(); // This will be /tmp in Lambda
    } else {
      tempPath = path.resolve(__dirname, "../temp");
      
      if (!fs.existsSync(tempPath)) {
        fs.mkdirSync(tempPath, { recursive: true });
      }
    }

    cb(null, tempPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix);
  }
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  }
});
