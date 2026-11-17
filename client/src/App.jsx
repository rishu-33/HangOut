import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/authStore';
import useRoomStore from './store/roomStore';
import { getSocket, initializeSocket } from './utils/socket';
import { useEffect } from 'react';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Rooms from './pages/Rooms';
import Room from './pages/Room';
import Profile from './pages/Profile';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" />;
};

// Public Route Component (redirect if authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return !isAuthenticated ? children : <Navigate to="/rooms" />;
};

function App() {
  const { token, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const socket = getSocket() || initializeSocket(token);

    const onMembersUpdated = ({ roomId, members }) => {
      useRoomStore.getState().updateRoomMembers(roomId, members);
    };

    const onProfileUpdated = ({ userId, username, avatar }) => {
      useRoomStore.getState().applyProfileUpdate(userId, username, avatar);
      const current = useAuthStore.getState().user;
      if (current && String(current._id) === String(userId)) {
        useAuthStore.getState().setUser({ username, avatar });
      }
    };

    socket.on('members-updated', onMembersUpdated);
    socket.on('profile-updated', onProfileUpdated);

    return () => {
      socket.off('members-updated', onMembersUpdated);
      socket.off('profile-updated', onProfileUpdated);
    };
  }, [isAuthenticated, token]);

  return (
    <Router>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1c171c',
            color: '#f7f1ea',
            border: '1px solid #3a3036',
            borderRadius: '0.75rem',
            padding: '12px 16px',
          },
          success: {
            iconTheme: {
              primary: '#c46b4a',
              secondary: '#f7f1ea',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#F2F2F0',
            },
          },
        }}
      />

      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />

        {/* Protected Routes */}
        <Route
          path="/rooms"
          element={
            <ProtectedRoute>
              <Rooms />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/room/:roomId"
          element={
            <ProtectedRoute>
              <Room />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
