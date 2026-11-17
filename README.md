# Hangout - Private Social Space

A premium, minimalist real-time social hangout platform built with the MERN stack. Create private rooms, chat with friends, share files, and play games together.

## ✨ Features

### Core Features
- **Private Rooms**: Create password-protected spaces with unique room IDs
- **Real-time Chat**: Instant messaging with typing indicators and online presence
- **File Sharing**: Upload and share images, videos, PDFs, and documents
- **Message Reactions**: React to messages with emojis
- **Message Management**: Delete messages and reply to specific messages
- **Member Management**: Room creators have admin privileges

### Mini-Games
- **Tic Tac Toe**: Classic two-player strategy game
- **Rock Paper Scissors**: Quick multiplayer matches
- **Quiz Battle**: (Coming soon)

### Design Philosophy
- Inspired by Linear, Vercel, and Apple's design principles
- Deep charcoal theme with sophisticated typography
- Minimal, purposeful animations
- No excessive gradients or unnecessary decorations
- Professional and calm aesthetic

## 🎨 Design System

### Colors
```
Background:  #0B0C0E
Surface:     #141619
Primary:     #F2F2F0
Secondary:   #92969D
Accent:      #6366F1
Border:      #2A2D32
```

### Typography
- Font: Inter
- Carefully controlled font weights
- Strong visual hierarchy
- Generous whitespace

## 🚀 Tech Stack

### Frontend
- **React.js** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Smooth animations
- **Socket.IO Client** - Real-time communication
- **Zustand** - State management
- **Axios** - HTTP client
- **React Router** - Navigation
- **React Hot Toast** - Notifications
- **Lucide React** - Icons
- **date-fns** - Date formatting

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Socket.IO** - Real-time engine
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Multer** - File uploads
- **Cloudinary** - File storage

## 📦 Project Structure

```
CODESHARE/
├── client/                 # Frontend React application
│   ├── public/
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   │   ├── games/    # Game components
│   │   │   ├── CreateRoomModal.jsx
│   │   │   ├── JoinRoomModal.jsx
│   │   │   ├── Message.jsx
│   │   │   ├── MembersSidebar.jsx
│   │   │   └── GamesPanel.jsx
│   │   ├── pages/        # Page components
│   │   │   ├── Landing.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Rooms.jsx
│   │   │   └── Room.jsx
│   │   ├── store/        # Zustand stores
│   │   │   ├── authStore.js
│   │   │   └── roomStore.js
│   │   ├── utils/        # Utility functions
│   │   │   ├── api.js
│   │   │   └── socket.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   └── package.json
│
├── server/                # Backend Node.js application
│   ├── config/           # Configuration files
│   │   ├── db.js
│   │   └── cloudinary.js
│   ├── controllers/      # Route controllers
│   │   ├── authController.js
│   │   ├── roomController.js
│   │   ├── messageController.js
│   │   └── gameController.js
│   ├── middleware/       # Custom middleware
│   │   ├── auth.js
│   │   └── upload.js
│   ├── models/          # Mongoose models
│   │   ├── User.js
│   │   ├── Room.js
│   │   ├── Message.js
│   │   └── Game.js
│   ├── routes/          # API routes
│   │   ├── authRoutes.js
│   │   ├── roomRoutes.js
│   │   ├── messageRoutes.js
│   │   └── gameRoutes.js
│   ├── utils/           # Utility functions
│   │   ├── generateToken.js
│   │   ├── generateRoomId.js
│   │   └── uploadToCloudinary.js
│   ├── server.js
│   └── package.json
│
└── README.md
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- Cloudinary account (for file uploads)

### 1. Clone the Repository
```bash
git clone <repository-url>
cd CODESHARE
```

### 2. Backend Setup

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Create .env file
cp .env.example .env
```

Edit `.env` with your configuration:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/hangout
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=7d
NODE_ENV=development

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# CORS Origin
CLIENT_URL=http://localhost:3000
```

### 3. Frontend Setup

```bash
# Navigate to client directory
cd ../client

# Install dependencies
npm install

# Create .env file (optional)
cp .env.example .env
```

Edit `.env` if needed:
```env
VITE_API_URL=http://localhost:5000
```

### 4. Start the Application

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## 🔐 Environment Variables

### Server (.env)
| Variable | Description | Required |
|----------|-------------|----------|
| PORT | Server port | Yes |
| MONGODB_URI | MongoDB connection string | Yes |
| JWT_SECRET | Secret key for JWT tokens | Yes |
| JWT_EXPIRE | Token expiration time | Yes |
| CLOUDINARY_CLOUD_NAME | Cloudinary cloud name | Yes |
| CLOUDINARY_API_KEY | Cloudinary API key | Yes |
| CLOUDINARY_API_SECRET | Cloudinary API secret | Yes |
| CLIENT_URL | Frontend URL for CORS | Yes |

### Client (.env)
| Variable | Description | Default |
|----------|-------------|---------|
| VITE_API_URL | Backend API URL | http://localhost:5000 |

## 📱 Usage

### Creating a Room
1. Register or log in to your account
2. Click "Create Room" on the rooms page
3. Enter a room name and password
4. Share the generated Room ID and password with friends

### Joining a Room
1. Click "Join Room"
2. Enter the Room ID and password
3. Start chatting!

### Playing Games
1. Inside a room, click the Games icon
2. Create a new game
3. Wait for another player to join
4. Play and have fun!

## 🎮 Game Rules

### Tic Tac Toe
- Classic 3x3 grid game
- Two players take turns
- First to get 3 in a row wins

### Rock Paper Scissors
- Both players choose simultaneously
- Rock beats Scissors
- Scissors beats Paper
- Paper beats Rock

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcryptjs
- Protected API routes
- Input validation
- File type and size restrictions
- CORS configuration
- Socket.IO authentication

## 📝 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile

### Rooms
- `POST /api/rooms` - Create room
- `POST /api/rooms/join` - Join room
- `GET /api/rooms` - Get user's rooms
- `GET /api/rooms/:roomId` - Get room details
- `DELETE /api/rooms/:roomId/leave` - Leave room
- `DELETE /api/rooms/:roomId/members/:userId` - Remove member

### Messages
- `GET /api/messages/:roomId` - Get messages
- `POST /api/messages/:roomId` - Send message
- `POST /api/messages/:roomId/upload` - Upload file
- `DELETE /api/messages/:messageId` - Delete message
- `POST /api/messages/:messageId/react` - Add reaction

### Games
- `POST /api/games` - Create game
- `POST /api/games/:gameId/join` - Join game
- `POST /api/games/:gameId/move` - Make move
- `GET /api/games/room/:roomId` - Get room games

## 🚦 Socket.IO Events

### Client → Server
- `join-room` - Join a room
- `leave-room` - Leave a room
- `send-message` - Send message
- `typing-start` - Start typing
- `typing-stop` - Stop typing
- `delete-message` - Delete message
- `message-reaction` - Add reaction
- `game-created` - New game created
- `game-updated` - Game state updated
- `player-joined-game` - Player joined game

### Server → Client
- `new-message` - New message received
- `user-joined` - User joined room
- `user-left` - User left room
- `user-typing` - User is typing
- `user-stop-typing` - User stopped typing
- `message-deleted` - Message was deleted
- `reaction-added` - Reaction was added
- `new-game` - New game available
- `game-update` - Game state changed
- `room-users` - Current room users

## 🐛 Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running
- Check connection string in .env
- Verify network access if using MongoDB Atlas

### Socket.IO Connection Issues
- Check if backend is running
- Verify CORS settings
- Check browser console for errors

### File Upload Issues
- Verify Cloudinary credentials
- Check file size limits (10MB max)
- Ensure proper file types

## 🤝 Contributing

This is a personal project, but suggestions and feedback are welcome!

## 📄 License

MIT License - feel free to use this project for learning purposes.

## 🙏 Acknowledgments

- Design inspiration: Linear, Vercel, Apple
- Icons: Lucide React
- Fonts: Inter by Rasmus Andersson

## 📧 Support

For issues or questions, please create an issue in the repository.

---

Built with ❤️ using the MERN stack
