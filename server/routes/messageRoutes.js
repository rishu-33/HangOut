import express from 'express';
import {
  getMessages,
  sendMessage,
  uploadFile,
  deleteMessage,
  addReaction
} from '../controllers/messageController.js';
import { protect } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

router.get('/:roomId', protect, getMessages);
router.post('/:roomId', protect, sendMessage);
router.post('/:roomId/upload', protect, upload.single('file'), uploadFile);
router.delete('/:messageId', protect, deleteMessage);
router.post('/:messageId/react', protect, addReaction);

export default router;
