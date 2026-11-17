import express from 'express';
import {
  createGame,
  joinGame,
  makeMove,
  getRoomGames,
  deleteGame,
  clearCompletedGames
} from '../controllers/gameController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/', protect, createGame);
router.post('/:gameId/join', protect, joinGame);
router.post('/:gameId/move', protect, makeMove);
router.get('/room/:roomId', protect, getRoomGames);
router.delete('/:gameId', protect, deleteGame);
router.delete('/room/:roomId/completed', protect, clearCompletedGames);

export default router;
