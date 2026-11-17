import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Gamepad2, Trash2 } from 'lucide-react';
import api from '../utils/api';
import { getSocket } from '../utils/socket';
import toast from 'react-hot-toast';
import TicTacToe from './games/TicTacToe';
import RockPaperScissors from './games/RockPaperScissors';

const GamesPanel = ({ roomId, onClose }) => {
  const [games, setGames] = useState([]);
  const [activeGame, setActiveGame] = useState(null);
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  const loadGames = useCallback(async () => {
    try {
      const { data } = await api.get(`/games/room/${roomId}`);
      setGames(data);
    } catch (error) {
      console.error('Failed to load games');
    }
  }, [roomId]);

  useEffect(() => {
    loadGames();

    const socket = getSocket();
    if (!socket) return undefined;

    const onNewGame = (game) => {
      setGames(prev => {
        if (prev.some(g => g._id === game._id)) return prev;
        return [game, ...prev];
      });
    };

    const onGameUpdate = (updatedGame) => {
      setGames(prev =>
        prev.map(g => (g._id === updatedGame._id ? updatedGame : g))
      );
      setActiveGame(prev => (prev?._id === updatedGame._id ? updatedGame : prev));
    };

    const onGameInvite = ({ game, inviter, gameType }) => {
      // Add the game to the list
      setGames(prev => {
        if (prev.some(g => g._id === game._id)) return prev;
        return [game, ...prev];
      });

      // Show a rich notification to all users in the room
      toast(
        (t) => (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎮</span>
              <span className="font-semibold">{inviter.username}</span>
              <span className="text-sm">wants to play!</span>
            </div>
            <p className="text-sm text-gray-300">
              Join a game of <strong>{gameType}</strong>
            </p>
            <div className="flex gap-2 mt-1">
              <button
                onClick={() => {
                  setActiveGame(game);
                  toast.dismiss(t.id);
                }}
                className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-colors"
              >
                Join Game
              </button>
              <button
                onClick={() => toast.dismiss(t.id)}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
              >
                Later
              </button>
            </div>
          </div>
        ),
        {
          duration: 15000,
          style: {
            background: '#1a1b1e',
            color: '#fff',
            border: '1px solid #2a2b2e',
            padding: '16px',
            maxWidth: '360px'
          }
        }
      );
    };

    const onProfileUpdated = ({ userId, username, avatar }) => {
      const patchPerson = (person) => {
        if (!person || typeof person !== 'object' || String(person._id) !== String(userId)) {
          return person;
        }
        return { ...person, username, avatar };
      };

      const patchGame = (game) => ({
        ...game,
        players: game.players?.map((player) => ({ ...player, user: patchPerson(player.user) })),
        winner: patchPerson(game.winner),
        currentTurn: patchPerson(game.currentTurn)
      });

      setGames((prev) => prev.map(patchGame));
      setActiveGame((prev) => (prev ? patchGame(prev) : prev));
    };

    const onGameDeleted = ({ gameId, auto }) => {
      setGames(prev => prev.filter(g => g._id !== gameId));
      setActiveGame(prev => (prev?._id === gameId ? null : prev));
      if (auto) {
        toast('A finished game was auto-removed', { icon: '🧹' });
      }
    };

    socket.on('new-game', onNewGame);
    socket.on('game-update', onGameUpdate);
    socket.on('game-invite', onGameInvite);
    socket.on('game-deleted', onGameDeleted);
    socket.on('profile-updated', onProfileUpdated);

    return () => {
      socket.off('new-game', onNewGame);
      socket.off('game-update', onGameUpdate);
      socket.off('game-invite', onGameInvite);
      socket.off('game-deleted', onGameDeleted);
      socket.off('profile-updated', onProfileUpdated);
    };
  }, [roomId, loadGames]);

  const deleteGame = async (gameId, e) => {
    if (e) e.stopPropagation();
    try {
      await api.delete(`/games/${gameId}`);
      setGames(prev => prev.filter(g => g._id !== gameId));
      if (activeGame?._id === gameId) {
        setActiveGame(null);
      }
      toast.success('Game removed');
    } catch (error) {
      toast.error('Failed to remove game');
    }
  };

  const clearCompleted = async () => {
    try {
      const { data } = await api.delete(`/games/room/${roomId}/completed`);
      setGames(prev => prev.filter(g => g.status !== 'completed'));
      if (activeGame?.status === 'completed') {
        setActiveGame(null);
      }
      toast.success(data.message || 'Completed games cleared');
    } catch (error) {
      toast.error('Failed to clear games');
    }
  };

  const createGame = async (type) => {
    try {
      const { data } = await api.post('/games', { roomId, type });
      setGames(prev => {
        if (prev.some(g => g._id === data._id)) return prev;
        return [data, ...prev];
      });
      setActiveGame(data);
      setShowCreateMenu(false);

      toast.success('Game created! Other players have been notified.');
    } catch (error) {
      toast.error('Failed to create game');
    }
  };

  const renderGame = () => {
    if (!activeGame) return null;

    switch (activeGame.type) {
      case 'tictactoe':
        return <TicTacToe game={activeGame} onUpdate={setActiveGame} />;
      case 'rockpaperscissors':
        return <RockPaperScissors game={activeGame} onUpdate={setActiveGame} />;
      default:
        return <div>Game type not supported</div>;
    }
  };

  if (activeGame) {
    return (
      <motion.div
        initial={{ x: 300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 300, opacity: 0 }}
        className="w-96 m-3 ml-0 rounded-3xl border border-white/10 bg-surface/90 backdrop-blur-xl flex flex-col overflow-hidden"
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold capitalize">
              {activeGame.type.replace(/([A-Z])/g, ' $1').trim()}
            </h2>
            {activeGame.status === 'completed' && (
              <span className="text-xs text-secondary">Auto-removes in 30s</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => deleteGame(activeGame._id)}
              className="p-2 hover:bg-red-500/20 text-secondary hover:text-red-400 rounded-lg transition-colors"
              title="Delete Game"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveGame(null)}
              className="p-2 hover:bg-background rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">{renderGame()}</div>
      </motion.div>
    );
  }

  const hasCompletedGames = games.some((g) => g.status === 'completed');

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      className="w-80 m-3 ml-0 rounded-3xl border border-white/10 bg-surface/90 backdrop-blur-xl flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="text-lg font-semibold">Games</h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-background rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Create Game Button */}
      <div className="p-4 border-b border-border space-y-2">
        <div className="relative">
          <button
            onClick={() => setShowCreateMenu(!showCreateMenu)}
            className="w-full px-4 py-2.5 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Game
          </button>

          {showCreateMenu && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-lg shadow-xl overflow-hidden z-10"
            >
              <button
                onClick={() => createGame('tictactoe')}
                className="w-full px-4 py-3 text-left hover:bg-surface transition-colors"
              >
                Tic Tac Toe
              </button>
              <button
                onClick={() => createGame('rockpaperscissors')}
                className="w-full px-4 py-3 text-left hover:bg-surface transition-colors"
              >
                Rock Paper Scissors
              </button>
              <button
                onClick={() => createGame('quiz')}
                className="w-full px-4 py-3 text-left hover:bg-surface transition-colors opacity-50 cursor-not-allowed"
                disabled
              >
                Quiz Battle (Coming Soon)
              </button>
            </motion.div>
          )}
        </div>

        {hasCompletedGames && (
          <button
            onClick={clearCompleted}
            className="w-full py-1.5 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Completed Games
          </button>
        )}
      </div>

      {/* Games List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {games.length === 0 ? (
          <div className="text-center py-12 text-secondary">
            <Gamepad2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No games yet</p>
            <p className="text-xs mt-1">Create one to start playing</p>
          </div>
        ) : (
          games.map((game) => (
            <div
              key={game._id}
              onClick={() => setActiveGame(game)}
              className="p-4 bg-background rounded-lg hover:bg-surface-light transition-colors cursor-pointer border border-border group"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium capitalize">
                  {game.type.replace(/([A-Z])/g, ' $1').trim()}
                </h3>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      game.status === 'active'
                        ? 'bg-green-500/20 text-green-400'
                        : game.status === 'waiting'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}
                  >
                    {game.status}
                  </span>
                  <button
                    onClick={(e) => deleteGame(game._id, e)}
                    className="p-1 hover:bg-red-500/20 text-secondary hover:text-red-400 rounded transition-colors"
                    title="Delete game"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="text-sm text-secondary flex items-center justify-between">
                <span>{game.players.length} / 2 players</span>
                {game.status === 'completed' && (
                  <span className="text-xs text-secondary/70">auto-removing...</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
};

export default GamesPanel;
