import { useState } from 'react';
import { motion } from 'framer-motion';
import useAuthStore from '../../store/authStore';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const choices = [
  { name: 'rock', emoji: '✊', label: 'Rock' },
  { name: 'paper', emoji: '✋', label: 'Paper' },
  { name: 'scissors', emoji: '✌️', label: 'Scissors' }
];

const RockPaperScissors = ({ game, onUpdate }) => {
  const { user } = useAuthStore();
  const [joining, setJoining] = useState(false);

  const isPlayer = game.players.some(p => p.user._id === user._id);
  const myPlayer = game.players.find(p => p.user._id === user._id);
  const hasChosen = myPlayer?.choice;

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

  const handleChoice = async (choice) => {
    if (!isPlayer || hasChosen || game.status !== 'active') return;

    try {
      const { data } = await api.post(`/games/${game._id}/move`, { choice });
      onUpdate(data);

      if (data.status === 'completed') {
        if (data.winner?._id === user._id) {
          toast.success('You won! 🎉');
        } else if (data.winner) {
          toast('You lost 😢');
        } else {
          toast('Draw! Play again?');
        }
      }
    } catch (error) {
      toast.error('Failed to make choice');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Players */}
      <div className="space-y-2">
        {game.players.map((player) => (
          <div
            key={player.user._id}
            className="p-3 bg-background rounded-lg"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{player.user.username}</span>
              <div>
                {player.choice ? (
                  game.status === 'completed' ? (
                    <span className="text-3xl">
                      {choices.find(c => c.name === player.choice)?.emoji}
                    </span>
                  ) : (
                    <span className="text-sm text-secondary">✓ Chosen</span>
                  )
                ) : (
                  <span className="text-sm text-secondary">Waiting...</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
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

      {game.status === 'active' && isPlayer && !hasChosen && (
        <div>
          <p className="text-center text-sm text-secondary mb-4">
            Choose your weapon
          </p>
          <div className="grid grid-cols-3 gap-3">
            {choices.map((choice) => (
              <motion.button
                key={choice.name}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleChoice(choice.name)}
                className="aspect-square bg-background border-2 border-border hover:border-accent rounded-lg flex flex-col items-center justify-center gap-2 transition-all"
              >
                <span className="text-4xl">{choice.emoji}</span>
                <span className="text-sm font-medium">{choice.label}</span>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {game.status === 'active' && isPlayer && hasChosen && (
        <div className="text-center p-6 bg-background rounded-lg">
          <p className="text-sm text-secondary mb-2">You chose</p>
          <p className="text-5xl mb-2">
            {choices.find(c => c.name === hasChosen)?.emoji}
          </p>
          <p className="text-sm text-secondary">Waiting for opponent...</p>
        </div>
      )}

      {game.status === 'completed' && (
        <div className="text-center p-4 bg-background rounded-lg space-y-3">
          <p className="text-lg font-semibold">
            {game.winner
              ? `${game.winner.username} wins!`
              : "It's a draw!"}
          </p>
          
          <div className="flex justify-center gap-6 text-5xl">
            {game.players.map((player, idx) => (
              <div key={player.user._id} className="text-center">
                <div>{choices.find(c => c.name === player.choice)?.emoji}</div>
                <p className="text-xs text-secondary mt-2">
                  {player.user.username}
                </p>
              </div>
            ))}
          </div>

          {game.winner?._id === user._id && (
            <p className="text-accent">Congratulations! 🎉</p>
          )}
          <p className="text-xs text-secondary mt-2">
            This game will auto-remove shortly
          </p>
        </div>
      )}
    </div>
  );
};

export default RockPaperScissors;
