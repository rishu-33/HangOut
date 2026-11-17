import Game from '../models/Game.js';
import Room from '../models/Room.js';
import { getIO } from '../socket.js';

const isRoomMember = (room, userId) =>
  room.members.some((member) => member.user.toString() === userId.toString());

// @desc    Create a new game
// @route   POST /api/games
// @access  Private
export const createGame = async (req, res) => {
  try {
    const { roomId, type } = req.body;

    if (typeof roomId !== 'string' || !roomId.trim()) {
      return res.status(400).json({ message: 'Room ID is required' });
    }

    // Validate game type
    if (!['tictactoe', 'rockpaperscissors', 'quiz'].includes(type)) {
      return res.status(400).json({ message: 'Invalid game type' });
    }

    // Find room
    const room = await Room.findOne({ roomId: roomId.toUpperCase() });
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check membership
    if (!isRoomMember(room, req.user._id)) {
      return res.status(403).json({ message: 'Not a member of this room' });
    }

    // Initialize game state based on type
    let initialState = {};
    if (type === 'tictactoe') {
      initialState = { board: Array(9).fill(null) };
    }

    // Create game
    const game = await Game.create({
      room: room._id,
      type,
      players: [{
        user: req.user._id,
        symbol: type === 'tictactoe' ? 'X' : null,
        score: 0
      }],
      gameState: initialState,
      currentTurn: req.user._id
    });

    await game.populate('players.user', 'username avatar');
    await game.populate('currentTurn', 'username avatar');

    // Broadcast game invite notification to all room members
    const io = getIO();
    if (io) {
      const gameTypeLabel = type === 'tictactoe' ? 'Tic Tac Toe' : type === 'rockpaperscissors' ? 'Rock Paper Scissors' : 'Quiz Battle';
      io.in(roomId.toUpperCase()).emit('game-invite', {
        game,
        inviter: { _id: req.user._id, username: req.user.username, avatar: req.user.avatar },
        gameType: gameTypeLabel,
        roomId: roomId.toUpperCase()
      });
    }

    res.status(201).json(game);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Join a game
// @route   POST /api/games/:gameId/join
// @access  Private
export const joinGame = async (req, res) => {
  try {
    const game = await Game.findById(req.params.gameId);

    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    const room = await Room.findById(game.room);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    if (!isRoomMember(room, req.user._id)) {
      return res.status(403).json({ message: 'Not a member of this room' });
    }

    if (game.status !== 'waiting') {
      return res.status(400).json({ message: 'Game already started or completed' });
    }

    // Check if already in game
    const alreadyJoined = game.players.some(p => p.user.toString() === req.user._id.toString());
    if (alreadyJoined) {
      return res.status(400).json({ message: 'Already in this game' });
    }

    // Check max players based on game type
    const maxPlayers = game.type === 'quiz' ? 10 : 2;
    if (game.players.length >= maxPlayers) {
      return res.status(400).json({ message: 'Game is full' });
    }

    // Add player
    game.players.push({
      user: req.user._id,
      symbol: game.type === 'tictactoe' ? 'O' : null,
      score: 0
    });

    // Start game if minimum players reached
    if (game.players.length === 2 || (game.type === 'quiz' && game.players.length >= 2)) {
      game.status = 'active';
    }

    await game.save();
    await game.populate('players.user', 'username avatar');
    await game.populate('currentTurn', 'username avatar');

    // Broadcast updated game to the room
    getIO()?.in(room.roomId).emit('game-update', game);

    res.json(game);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Make a game move
// @route   POST /api/games/:gameId/move
// @access  Private
export const makeMove = async (req, res) => {
  try {
    const game = await Game.findById(req.params.gameId);

    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    const room = await Room.findById(game.room);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    if (!isRoomMember(room, req.user._id)) {
      return res.status(403).json({ message: 'Not a member of this room' });
    }

    if (game.status !== 'active') {
      return res.status(400).json({ message: 'Game is not active' });
    }

    // Check if the player is in the game
    const player = game.players.find(p => p.user.toString() === req.user._id.toString());
    if (!player) {
      return res.status(400).json({ message: 'You are not in this game' });
    }

    // Process move based on game type
    if (game.type === 'tictactoe') {
      // Tic Tac Toe is turn-based: check if it's the player's turn
      if (game.currentTurn.toString() !== req.user._id.toString()) {
        return res.status(400).json({ message: 'Not your turn' });
      }

      const { position } = req.body;

      if (position === undefined || position < 0 || position > 8) {
        return res.status(400).json({ message: 'Invalid position' });
      }

      if (game.gameState.board[position] !== null) {
        return res.status(400).json({ message: 'Position already taken' });
      }

      game.gameState.board[position] = player.symbol;
      game.markModified('gameState');

      // Check for winner
      const winner = checkTicTacToeWinner(game.gameState.board);
      if (winner) {
        game.status = 'completed';
        game.winner = req.user._id;
        game.completedAt = Date.now();
      } else if (!game.gameState.board.includes(null)) {
        // Draw
        game.status = 'completed';
        game.completedAt = Date.now();
      } else {
        // Switch turn
        const nextPlayer = game.players.find(p => p.user.toString() !== req.user._id.toString());
        game.currentTurn = nextPlayer.user;
      }
    } else if (game.type === 'rockpaperscissors') {
      // RPS is simultaneous: both players choose independently (no turn check)
      const { choice } = req.body;

      if (!['rock', 'paper', 'scissors'].includes(choice)) {
        return res.status(400).json({ message: 'Invalid choice' });
      }

      // Check if player already made a choice
      if (player.choice) {
        return res.status(400).json({ message: 'You already made your choice' });
      }

      player.choice = choice;

      // Check if both players made their choice
      if (game.players.every(p => p.choice)) {
        const result = determineRPSWinner(game.players[0].choice, game.players[1].choice);
        
        if (result === 0) {
          // Draw - reset choices for another round
          game.players.forEach(p => { p.choice = null; });
        } else {
          const winnerIndex = result === 1 ? 0 : 1;
          game.players[winnerIndex].score += 1;
          game.winner = game.players[winnerIndex].user;
          game.status = 'completed';
          game.completedAt = Date.now();
        }
      }
    }

    await game.save();
    await game.populate('players.user', 'username avatar');
    await game.populate('currentTurn', 'username avatar');
    await game.populate('winner', 'username avatar');

    // Broadcast updated game state to the room
    const io = getIO();
    if (io) {
      io.in(room.roomId).emit('game-update', game);
    }

    // Auto-remove game after playing (after 30 seconds of completion so players see results)
    if (game.status === 'completed') {
      const completedGameId = game._id;
      const targetRoomCode = room.roomId;
      setTimeout(async () => {
        try {
          const existing = await Game.findById(completedGameId);
          if (existing && existing.status === 'completed') {
            await Game.findByIdAndDelete(completedGameId);
            const liveIo = getIO();
            if (liveIo && targetRoomCode) {
              liveIo.in(targetRoomCode).emit('game-deleted', {
                gameId: completedGameId.toString(),
                auto: true
              });
            }
          }
        } catch (cleanupErr) {
          console.error('Error auto-removing completed game:', cleanupErr);
        }
      }, 30000);
    }

    res.json(game);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get games for a room
// @route   GET /api/games/room/:roomId
// @access  Private
export const getRoomGames = async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId.toUpperCase() });
    
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    if (!isRoomMember(room, req.user._id)) {
      return res.status(403).json({ message: 'Not a member of this room' });
    }

    const games = await Game.find({ room: room._id })
      .populate('players.user', 'username avatar')
      .populate('currentTurn', 'username avatar')
      .populate('winner', 'username avatar')
      .sort('-createdAt')
      .limit(20);

    res.json(games);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete a single game
// @route   DELETE /api/games/:gameId
// @access  Private
export const deleteGame = async (req, res) => {
  try {
    const game = await Game.findById(req.params.gameId);
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    const room = await Room.findById(game.room);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    if (!isRoomMember(room, req.user._id)) {
      return res.status(403).json({ message: 'Not a member of this room' });
    }

    await Game.findByIdAndDelete(req.params.gameId);

    const io = getIO();
    if (io) {
      io.in(room.roomId).emit('game-deleted', { gameId: req.params.gameId });
    }

    res.json({ message: 'Game deleted successfully', gameId: req.params.gameId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Clear all completed games in a room
// @route   DELETE /api/games/room/:roomId/completed
// @access  Private
export const clearCompletedGames = async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId.toUpperCase() });
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    if (!isRoomMember(room, req.user._id)) {
      return res.status(403).json({ message: 'Not a member of this room' });
    }

    const completed = await Game.find({ room: room._id, status: 'completed' });
    const ids = completed.map((g) => g._id.toString());

    await Game.deleteMany({ room: room._id, status: 'completed' });

    const io = getIO();
    if (io && ids.length > 0) {
      ids.forEach((id) => {
        io.in(room.roomId).emit('game-deleted', { gameId: id });
      });
    }

    res.json({ message: 'Completed games cleared', count: ids.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Helper function to check tic-tac-toe winner
const checkTicTacToeWinner = (board) => {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
    [0, 4, 8], [2, 4, 6] // diagonals
  ];

  for (let line of lines) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
};

// Helper function to determine rock-paper-scissors winner
const determineRPSWinner = (choice1, choice2) => {
  if (choice1 === choice2) return 0; // draw
  if (
    (choice1 === 'rock' && choice2 === 'scissors') ||
    (choice1 === 'paper' && choice2 === 'rock') ||
    (choice1 === 'scissors' && choice2 === 'paper')
  ) {
    return 1; // player 1 wins
  }
  return 2; // player 2 wins
};
