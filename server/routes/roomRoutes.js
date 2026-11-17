import express from 'express';
import {
  createRoom,
  joinRoom,
  getUserRooms,
  getRoomById,
  leaveRoom,
  removeMember,
  deleteRoom
} from '../controllers/roomController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/', protect, createRoom);
router.post('/join', protect, joinRoom);
router.get('/', protect, getUserRooms);
router.get('/:roomId', protect, getRoomById);
router.delete('/:roomId', protect, deleteRoom);
router.delete('/:roomId/leave', protect, leaveRoom);
router.delete('/:roomId/members/:userId', protect, removeMember);

export default router;
