import mongoose from 'mongoose';

const gameSchema = new mongoose.Schema({
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  type: {
    type: String,
    enum: ['tictactoe', 'rockpaperscissors', 'quiz'],
    required: true
  },
  players: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    symbol: String, // For tic-tac-toe (X/O)
    choice: String, // For rock-paper-scissors
    score: {
      type: Number,
      default: 0
    }
  }],
  status: {
    type: String,
    enum: ['waiting', 'active', 'completed', 'abandoned'],
    default: 'waiting'
  },
  currentTurn: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  gameState: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date,
    default: null
  }
});

const Game = mongoose.model('Game', gameSchema);

export default Game;
