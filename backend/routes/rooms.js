const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const authMiddleware = require('../middleware/auth');

// Get all questions (public)
router.get('/questions', roomController.getQuestions);

// Protected routes (require authentication)
router.post('/create', authMiddleware, roomController.createRoom);
router.post('/join', authMiddleware, roomController.joinRoom);
router.post('/start', authMiddleware, roomController.startRoom);
router.post('/run', authMiddleware, roomController.runCode);
router.post('/submit', authMiddleware, roomController.submitCode);
router.get('/:roomId/leaderboard', authMiddleware, roomController.getLeaderboard);
router.post('/:roomId/finish', authMiddleware, roomController.finishRoom);
router.get('/:roomId', authMiddleware, roomController.getRoomDetails);

module.exports = router;
