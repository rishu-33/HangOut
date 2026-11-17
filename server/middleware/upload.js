
import multer from 'multer';
import path from 'path';

// Configure Multer for memory storage
const storage = multer.memoryStorage();

// Allowed file extensions and matching MIME types
const allowedFileTypes = {
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
  '.gif': ['image/gif'],
  '.pdf': ['application/pdf'],
  '.doc': ['application/msword'],
  '.docx': [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  '.txt': ['text/plain'],
  '.mp4': ['video/mp4'],
  '.webm': ['video/webm'],
  '.ogg': ['audio/ogg', 'video/ogg']
};

// General file filter
const fileFilter = (req, file, cb) => {
  const extname = path.extname(file.originalname).toLowerCase();
  const allowedMimeTypes = allowedFileTypes[extname];

  if (allowedMimeTypes && allowedMimeTypes.includes(file.mimetype)) {
    return cb(null, true);
  }

  return cb(
    new Error(
      'Invalid file type. Only images, videos, and documents are allowed.'
    )
  );
};

// General upload configuration
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter
});

// Allowed profile picture extensions and MIME types
const allowedAvatarTypes = {
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
  '.gif': ['image/gif'],
  '.webp': ['image/webp']
};

// Profile picture filter
const avatarFileFilter = (req, file, cb) => {
  const extname = path.extname(file.originalname).toLowerCase();
  const allowedMimeTypes = allowedAvatarTypes[extname];

  if (allowedMimeTypes && allowedMimeTypes.includes(file.mimetype)) {
    return cb(null, true);
  }

  return cb(
    new Error('Profile picture must be a JPEG, PNG, GIF, or WebP image')
  );
};

// Profile picture upload configuration
const avatarUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: avatarFileFilter
});

// Handle profile picture upload errors
export const handleAvatarUpload = (req, res, next) => {
  avatarUpload.single('avatar')(req, res, (err) => {
    if (!err) {
      return next();
    }

    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'Profile picture must be under 5MB'
        : err.message;

    return res.status(400).json({ message });
  });
};

// Export general upload middleware
export default upload;
