import { useState } from 'react';
import { motion } from 'framer-motion';
import useAuthStore from '../../store/authStore';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const TicTacToe = ({ game, onUpdate }) => {
  const { user } = useAuthStore();
  const [joining, setJoining] = useState(false);

  const isPlayer = game.players.some(p => p.user._id === user._id);
  const isMyTurn = game.currentTurn?._id === user._id;
  const mySymbol = game.players.find(p => p.user._id === user._id)?.symbol;

  const handleJoinGame = async () => {
    setJoining(true);
    try {
      const { data } = await api.post(`/games/${game._id}/join`);
      onUpdate(data);
      toast.success('Joined game!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to join game');
    }
    setJoining(false);
  };

  const handleMove = async (position) => {
    if (!isMyTurn || !isPlayer || game.status !== 'active') return;

    try {
      const { data } = await api.post(`/games/${game._id}/move`, { position });
      onUpdate(data);

      if (data.status === 'completed') {
        if (data.winner?._id === user._id) {
          toast.success('You won! 🎉');
        } else if (data.winner) {
          toast('You lost 😢');
        } else {
          toast('Draw!');
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid move');
    }
  };

  const renderCell = (index) => {
    const value = game.gameState.board[index];
    const canClick = isMyTurn && isPlayer && !value && game.status === 'active';

    return (
      <motion.button
        key={index}
        whileHover={canClick ? { scale: 1.05 } : {}}
        whileTap={canClick ? { scale: 0.95 } : {}}
        onClick={() => handleMove(index)}
        disabled={!canClick}
        className={`aspect-square bg-background border-2 border-border rounded-lg flex items-center justify-center text-3xl font-bold transition-all ${
          canClick ? 'hover:border-accent cursor-pointer' : 'cursor-not-allowed'
        } ${value === 'X' ? 'text-accent' : 'text-purple-400'}`}
      >
        {value}
      </motion.button>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Players */}
      <div className="space-y-2">
        {game.players.map((player) => (
          <div
            key={player.user._id}
            className={`p-3 rounded-lg ${
              game.currentTurn?._id === player.user._id
                ? 'bg-accent/20 border border-accent'
                : 'bg-background'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{player.user.username}</span>
              <span className="text-2xl">{player.symbol}</span>
            </div>
            {game.currentTurn?._id === player.user._id && game.status === 'active' && (
              <p className="text-xs text-secondary mt-1">Their turn</p>
            )}
          </div>
        ))}
      </div>

      {/* Board */}
      {game.status === 'waiting' && !isPlayer && (
        <button
          onClick={handleJoinGame}
          disabled={joining}
          className="w-full py-3 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-all disabled:opacity-50"
        >
          {joining ? 'Joining...' : 'Join Game'}
        </button>
      )}

      {game.status === 'waiting' && isPlayer && (
        <div className="text-center text-secondary py-4">
          Waiting for another player...
        </div>
      )}

      {game.status === 'active' && (
        <div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(renderCell)}
          </div>
          {isMyTurn && (
            <p className="text-center text-sm text-accent">Your turn ({mySymbol})</p>
          )}
        </div>
      )}

      {game.status === 'completed' && (
        <div className="text-center p-4 bg-background rounded-lg space-y-2">
          <p className="text-lg font-semibold mb-2">
            {game.winner
              ? `${game.winner.username} wins!`
              : "It's a draw!"}
          </p>
          {game.winner?._id === user._id && (
            <p className="text-accent">Congratulations! 🎉</p>
          )}
          <p className="text-xs text-secondary">
            This game will auto-remove shortly
          </p>
        </div>
      )}
    </div>
  );
};

export default TicTacToe;
