# Competitive Rooms Feature - Implementation Guide

## Overview
The Competitive Rooms feature enables real-time competitive coding sessions with up to 10 participants. Users can create rooms, solve coding problems, and compete based on test results, time complexity, and execution speed.

## Features Implemented

### Backend Components

#### 1. **Data Models**
- **Room Model** (`backend/models/roomModel.js`)
  - Stores room information, question details, members, status, and rankings
  - Supports three statuses: open, running, finished

- **Submission Model** (`backend/models/submissionModel.js`)
  - Tracks code submissions per user per room
  - Records execution metrics, test results, and time complexity

- **User Model Updates** (`backend/models/userModel.js`)
  - Added `badges` array to store earned badges
  - Added `credits` field to track user points

#### 2. **Questions Database** (`backend/data/questions.json`)
Five competitive coding problems included:
1. Longest Strictly Increasing Segment
2. Maximum Subarray Sum With One Deletion
3. Smallest String After One Swap
4. Longest Balanced Parentheses Substring
5. Minimum Flips to Make Binary String Alternating

Each question includes:
- Problem description
- Input/output format
- Constraints
- Sample test cases
- Hidden test cases for evaluation

#### 3. **Services**

**Code Executor** (`backend/services/codeExecutor.js`)
- Executes user code against test cases
- Supports Python, JavaScript, C++, and Java
- Measures execution time and memory usage
- Infers time complexity from code patterns
- Sandboxed execution with timeouts

**Ranking Service** (`backend/services/rankingService.js`)
- Ranks participants by:
  1. Number of tests passed (higher is better)
  2. Submission time (earlier is better)
  3. Time complexity (lower is better)
  4. Execution time (faster is better)

**Badge Service** (`backend/services/badgeService.js`)
- Awards badges based on performance:
  - `first-solver` (50 credits) - First to solve the problem
  - `best-complexity` (40 credits) - Most optimal solution
  - `zero-wrong-attempts` (30 credits) - Solved on first try
  - `top-3` (100/60/40 credits) - Finished in top 3
- Updates user credits automatically

#### 4. **API Endpoints** (`backend/controllers/roomController.js`)

- `GET /rooms/questions` - Get all available questions
- `POST /rooms/create` - Create a new room (requires auth)
- `POST /rooms/join` - Join an existing room (requires auth)
- `POST /rooms/start` - Start the competition (creator only)
- `POST /rooms/submit` - Submit code for evaluation
- `GET /rooms/:roomId/leaderboard` - Get current leaderboard
- `POST /rooms/:roomId/finish` - Finish room and award badges
- `GET /rooms/:roomId` - Get room details

#### 5. **Real-time Features** (Socket.IO)
Socket events implemented in `backend/bin/www`:
- `join-room` - User joins a room
- `leave-room` - User leaves a room
- `room:joined` - Broadcast when someone joins
- `room:started` - Broadcast when room starts
- `submission:received` - Broadcast when code is submitted
- `leaderboard:update` - Real-time leaderboard updates
- `room:finished` - Broadcast when room ends

### Frontend Components

#### 1. **Create Room Page** (`frontend/src/pages/CreateRoom.jsx`)
- Browse and select from 5 competitive problems
- Display problem details before creation
- Generate unique 8-character room ID
- Redirect to room after creation

#### 2. **Join Room Page** (`frontend/src/pages/JoinRoom.jsx`)
- Enter room ID to join
- Validation and error handling
- Instructions for users
- Redirect to room after joining

#### 3. **Room Page** (`frontend/src/pages/Room.jsx`)
Main competitive interface with:
- **Problem Description Panel**: Shows question details and samples
- **Code Editor**: Monaco editor with multi-language support
- **Real-time Leaderboard**: Live updates of participant rankings
- **Timer**: Tracks elapsed time since room start
- **Submit Button**: Evaluate code against test cases
- **Room Controls**: Start/Finish room (creator only)

Real-time features:
- Live participant count
- Instant leaderboard updates
- Toast notifications for events
- Socket.IO integration

#### 4. **Room Summary Page** (`frontend/src/pages/RoomSummary.jsx`)
Post-competition results:
- User's final rank and performance
- Badges earned with icons
- Complete leaderboard with all participants
- Performance metrics (complexity, execution time)
- Navigation to create new rooms

#### 5. **Home Page Updates** (`frontend/src/pages/Home.jsx`)
- Added prominent "Competitive Coding Rooms" section
- Quick access buttons to create or join rooms
- Attractive gradient design

## Installation & Setup

### Backend Setup

1. **Install dependencies:**
```bash
cd backend
npm install socket.io
```

2. **Environment variables** (`.env`):
```env
MONGO_CONN=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_gemini_api_key
PORT=3000
```

3. **Start the backend:**
```bash
npm start
```

### Frontend Setup

1. **Install dependencies:**
```bash
cd frontend
npm install socket.io-client
```

2. **Update API URL** (`src/helper.js`):
```javascript
export const api_base_url = "http://localhost:3000";
```

3. **Start the frontend:**
```bash
npm run dev
```

## Usage Flow

1. **Create Room**:
   - Navigate to "Create Room"
   - Select a problem from the list
   - Click "Create Room"
   - Share the generated Room ID with participants

2. **Join Room**:
   - Navigate to "Join Room"
   - Enter the Room ID
   - Click "Join Room"

3. **Compete**:
   - Wait for the creator to start the room
   - Write your solution in the code editor
   - Submit your code
   - Watch the leaderboard update in real-time

4. **Results**:
   - Creator finishes the room
   - View final rankings and badges
   - Check your performance metrics

## Technical Highlights

### Code Execution
- Sandboxed execution with timeout protection
- Multi-language support (Python, JavaScript, C++, Java)
- Automatic time complexity inference
- Hidden test cases for fair evaluation

### Ranking Algorithm
Multi-criteria sorting ensures fair competition:
1. Correctness (tests passed)
2. Speed (submission time)
3. Efficiency (time complexity)
4. Performance (execution time)

### Real-time Updates
- Socket.IO for instant communication
- Room-based event broadcasting
- Live leaderboard updates
- Participant notifications

### Security
- JWT authentication for all endpoints
- Creator-only room controls
- Input validation and sanitization
- Timeout protection for code execution

## Database Schema

### Room Collection
```javascript
{
  roomId: String (unique),
  createdBy: ObjectId,
  members: [ObjectId],
  question: { ... },
  status: "open" | "running" | "finished",
  startTime: Date,
  endTime: Date,
  rankings: [{ userId, rank, passed, badges, ... }]
}
```

### Submission Collection
```javascript
{
  roomId: String,
  userId: ObjectId,
  code: String,
  language: String,
  execTime: Number,
  memory: Number,
  timeComplexity: String,
  passed: Boolean,
  testsPassed: Number,
  testsTotal: Number,
  submittedAt: Date
}
```

## Future Enhancements

- [ ] Private rooms with passwords
- [ ] Spectator mode
- [ ] Custom problem upload
- [ ] Team-based competitions
- [ ] Historical statistics
- [ ] Achievement system
- [ ] Rating system (ELO)
- [ ] Problem difficulty levels

## Troubleshooting

### Code execution fails
- Ensure Python, Node.js, g++, or Java is installed on the server
- Check file system permissions for temp directory
- Verify timeout settings

### Socket connection issues
- Confirm backend is running on port 3000
- Check CORS settings
- Verify Socket.IO versions match

### Ranking not updating
- Check Socket.IO connection
- Verify authentication tokens
- Ensure room status is "running"

## Credits

Built with:
- Node.js + Express
- MongoDB + Mongoose
- Socket.IO
- React + Vite
- Monaco Editor
- Tailwind CSS

---

**Author**: GitHub Copilot
**Date**: November 27, 2025
**Version**: 1.0.0
