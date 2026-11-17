import cloudinary from '../config/cloudinary.js';
import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if Cloudinary is configured
const isCloudinaryConfigured = () => {
  return (
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET &&
    process.env.CLOUDINARY_CLOUD_NAME !== 'your_actual_cloud_name_here' &&
    process.env.CLOUDINARY_API_KEY !== 'your_actual_api_key_here'
  );
};

// Local file upload fallback
const uploadToLocal = async (buffer, filename, folder = 'hangout') => {
  return new Promise((resolve, reject) => {
    try {
      // Create uploads directory if it doesn't exist
      const uploadDir = path.join(__dirname, '..', 'uploads', folder);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(7);
      const ext = path.extname(filename);
      const baseName = path.basename(filename, ext);
      const uniqueFilename = `${baseName}-${timestamp}-${randomString}${ext}`;
      const filePath = path.join(uploadDir, uniqueFilename);

      // Write file
      fs.writeFileSync(filePath, buffer);

      // Return URL-like object similar to Cloudinary
      const result = {
        secure_url: `/uploads/${folder}/${uniqueFilename}`,
        public_id: `${folder}/${uniqueFilename}`,
        resource_type: ext.match(/\.(jpg|jpeg|png|gif)$/i) ? 'image' : 'raw'
      };

      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
};

const uploadToCloudinary = (buffer, folder = 'hangout', filename = 'file') => {
  // Use local storage if Cloudinary is not configured
  if (!isCloudinaryConfigured()) {
    console.log('Cloudinary not configured, using local storage');
    return uploadToLocal(buffer, filename, folder);
  }

  // Use Cloudinary if configured
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: 'auto'
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          // Fallback to local storage on error
          uploadToLocal(buffer, filename, folder)
            .then(resolve)
            .catch(reject);
        } else {
          resolve(result);
        }
      }
    );

    const readableStream = Readable.from(buffer);
    readableStream.pipe(uploadStream);
  });
};

export default uploadToCloudinary;
