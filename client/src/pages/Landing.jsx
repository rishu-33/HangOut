import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Users, Lock } from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-primary overflow-hidden">
      {/* Subtle animated background */}
      <div className="fixed inset-0 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-transparent"></div>
        <div className="absolute top-1/4 -left-40 w-80 h-80 bg-accent/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 -right-40 w-96 h-96 bg-accent/5 rounded-full blur-3xl"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 px-6 py-6 flex items-center justify-between max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-xl font-semibold tracking-tight"
        >
          Hangout
        </motion.div>
        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate('/login')}
          className="px-4 py-2 text-sm font-medium text-secondary hover:text-primary transition-colors"
        >
          Login
        </motion.button>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-20 pb-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-8"
        >
          {/* Main Headline */}
          <h1 className="font-display text-6xl md:text-7xl font-medium tracking-tight leading-tight">
            Your private space
            <br />
            <span className="text-secondary">to connect</span>
          </h1>

          {/* Supporting Text */}
          <p className="text-lg text-secondary max-w-2xl mx-auto leading-relaxed">
            Create intimate rooms for your closest friends. Chat, share, and play together 
            in a beautifully crafted social space designed for privacy.
          </p>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8"
          >
            <button
              onClick={() => navigate('/register')}
              className="group relative px-8 py-3.5 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-all duration-200 overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Create Room
              </span>
            </button>
            
            <button
              onClick={() => navigate('/register')}
              className="px-8 py-3.5 bg-surface hover:bg-surface-light text-primary font-medium rounded-lg border border-border transition-all duration-200"
            >
              <span className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Join Room
              </span>
            </button>
          </motion.div>
        </motion.div>

        {/* Feature Highlights */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-32"
        >
          {[
            {
              title: 'Private Rooms',
              description: 'Create password-protected spaces for your circle'
            },
            {
              title: 'Real-time Chat',
              description: 'Stay connected with instant messaging and reactions'
            },
            {
              title: 'Play Together',
              description: 'Enjoy built-in games with your friends'
            }
          ].map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              className="p-6 bg-surface/50 border border-border rounded-xl backdrop-blur-sm"
            >
              <h3 className="text-lg font-medium mb-2">{feature.title}</h3>
              <p className="text-secondary text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Minimal Footer */}
      <footer className="relative z-10 border-t border-border mt-20">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between text-sm text-secondary">
            <p>&copy; 2026 Hangout. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-primary transition-colors">Privacy</a>
              <a href="#" className="hover:text-primary transition-colors">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
