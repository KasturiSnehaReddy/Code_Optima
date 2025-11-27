const Room = require('../models/roomModel');
const Submission = require('../models/submissionModel');
const User = require('../models/userModel');
const questions = require('../data/questions.json');
const codeExecutor = require('../services/codeExecutor');
const rankingService = require('../services/rankingService');
const badgeService = require('../services/badgeService');
const crypto = require('crypto');

// Generate unique room ID
const generateRoomId = () => {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
};

// Create a new room
exports.createRoom = async (req, res) => {
  try {
    const { questionId, maxMembers } = req.body;
    const userId = req.user._id; // Assuming auth middleware adds user to req

    // Validate and convert maxMembers to number
    const maxMembersNum = parseInt(maxMembers) || 10;
    
    // Ensure it's within valid range
    const validMaxMembers = Math.max(2, Math.min(10, maxMembersNum));

    // Find the question
    const question = questions.find(q => q.id === questionId);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Generate unique room ID
    const roomId = generateRoomId();

    // Create room
    const room = new Room({
      roomId,
      createdBy: userId,
      members: [userId],
      maxMembers: validMaxMembers,
      question: {
        id: question.id,
        title: question.title,
        description: question.description,
        inputFormat: question.inputFormat,
        outputFormat: question.outputFormat,
        constraints: question.constraints,
        samples: question.samples,
        hiddenTestcases: question.testcases,
      },
      status: 'open',
    });

    await room.save();

    res.status(201).json({
      success: true,
      room: {
        roomId: room.roomId,
        question: {
          id: question.id,
          title: question.title,
          description: question.description,
          inputFormat: question.inputFormat,
          outputFormat: question.outputFormat,
          constraints: question.constraints,
          samples: question.samples,
        },
        status: room.status,
        members: room.members,
        maxMembers: room.maxMembers,
      },
    });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
};

// Join a room
exports.joinRoom = async (req, res) => {
  try {
    const { roomId } = req.body;
    const userId = req.user._id;

    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.status !== 'open') {
      return res.status(400).json({ error: 'Room has already started or finished' });
    }

    // Check if room is full
    if (room.members.length >= room.maxMembers) {
      return res.status(400).json({ error: `Room is full (${room.maxMembers}/${room.maxMembers})` });
    }

    if (room.members.length >= room.maxMembers) {
      return res.status(400).json({ error: `Room is full (max ${room.maxMembers} members)` });
    }

    if (room.members.includes(userId)) {
      return res.status(400).json({ error: 'Already in the room' });
    }

    room.members.push(userId);
    await room.save();

    // Get socket.io instance
    const io = req.app.get('io');
    
    // Check if room is now full and auto-lock it
    if (room.members.length >= room.maxMembers) {
      room.status = 'running';
      room.startTime = new Date();
      room.endTime = new Date(Date.now() + room.duration);
      await room.save();
      
      // Notify all members that room is full and starting
      if (io) {
        io.to(roomId).emit('room:started', {
          startTime: room.startTime,
          endTime: room.endTime,
          duration: room.duration,
          autoStarted: true,
          message: 'Room is full! Starting competition...'
        });
      }

      // Schedule auto-finish after duration
      setTimeout(async () => {
        try {
          const roomCheck = await Room.findOne({ roomId });
          if (roomCheck && roomCheck.status === 'running') {
            // Find the creator to call finishRoom
            const finishReq = { 
              params: { roomId }, 
              user: { _id: room.createdBy },
              app: req.app 
            };
            const finishRes = {
              json: (data) => console.log('Auto-finished room:', roomId, data),
              status: (code) => ({ json: (data) => console.log('Status:', code, data) })
            };
            await exports.finishRoom(finishReq, finishRes);
          }
        } catch (error) {
          console.error('Error auto-finishing room:', error);
        }
      }, room.duration);
    }

    // Emit socket event for new member
    if (io) {
      io.to(roomId).emit('room:joined', {
        userId,
        memberCount: room.members.length,
      });
    }

    res.json({
      success: true,
      room: {
        roomId: room.roomId,
        question: {
          id: room.question.id,
          title: room.question.title,
          description: room.question.description,
          inputFormat: room.question.inputFormat,
          outputFormat: room.question.outputFormat,
          constraints: room.question.constraints,
          samples: room.question.samples,
        },
        status: room.status,
        members: room.members,
        maxMembers: room.maxMembers,
      },
    });
  } catch (error) {
    console.error('Error joining room:', error);
    res.status(500).json({ error: 'Failed to join room' });
  }
};

// Start the room
exports.startRoom = async (req, res) => {
  try {
    const { roomId } = req.body;
    const userId = req.user._id;

    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Only room creator can start the room' });
    }

    if (room.status !== 'open') {
      return res.status(400).json({ error: 'Room already started or finished' });
    }

    room.status = 'running';
    room.startTime = new Date();
    room.endTime = new Date(Date.now() + room.duration);
    await room.save();

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(roomId).emit('room:started', {
        startTime: room.startTime,
        endTime: room.endTime,
        duration: room.duration
      });
    }

    // Schedule auto-finish after duration
    setTimeout(async () => {
      try {
        const roomCheck = await Room.findOne({ roomId });
        if (roomCheck && roomCheck.status === 'running') {
          // Call finishRoom internally
          const finishReq = { 
            params: { roomId }, 
            user: { _id: userId },
            app: req.app 
          };
          const finishRes = {
            json: (data) => console.log('Auto-finished room:', roomId, data),
            status: (code) => ({ json: (data) => console.log('Status:', code, data) })
          };
          await exports.finishRoom(finishReq, finishRes);
        }
      } catch (error) {
        console.error('Error auto-finishing room:', error);
      }
    }, room.duration);

    res.json({
      success: true,
      startTime: room.startTime,
    });
  } catch (error) {
    console.error('Error starting room:', error);
    res.status(500).json({ error: 'Failed to start room' });
  }
};

// Run code against sample test cases only (no submission)
exports.runCode = async (req, res) => {
  try {
    const { roomId, code, language } = req.body;
    const userId = req.user._id;

    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.status !== 'running') {
      return res.status(400).json({ error: 'Room is not running' });
    }

    if (!room.members.includes(userId)) {
      return res.status(403).json({ error: 'Not a member of this room' });
    }

    // Execute code only against SAMPLE test cases (visible ones)
    const executionResult = await codeExecutor.executeCode(
      code,
      language,
      room.question.samples, // Only sample test cases, not hidden ones
      false // Don't stop on failure for Run
    );

    res.json({
      success: true,
      result: {
        passed: executionResult.passed,
        testsPassed: executionResult.testsPassed,
        testsTotal: executionResult.testsTotal,
        results: executionResult.results,
      },
    });
  } catch (error) {
    console.error('Error running code:', error);
    res.status(500).json({ error: error.message || 'Failed to run code' });
  }
};

// Submit code
exports.submitCode = async (req, res) => {
  try {
    const { roomId, code, language } = req.body;
    const userId = req.user._id;

    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.status !== 'running') {
      return res.status(400).json({ error: 'Room is not running' });
    }

    if (!room.members.includes(userId)) {
      return res.status(403).json({ error: 'Not a member of this room' });
    }

    // Execute code against testcases (stop on first failure like LeetCode)
    const executionResult = await codeExecutor.executeCode(
      code,
      language,
      room.question.hiddenTestcases,
      true // Stop on first failure
    );

    // Save submission
    const submission = new Submission({
      roomId,
      userId,
      code,
      language,
      execTime: executionResult.execTime,
      memory: executionResult.memory,
      timeComplexity: executionResult.timeComplexity,
      passed: executionResult.passed,
      testsPassed: executionResult.testsPassed,
      testsTotal: executionResult.testsTotal,
    });

    await submission.save();

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(roomId).emit('submission:received', {
        userId,
        passed: executionResult.passed,
        testsPassed: executionResult.testsPassed,
        testsTotal: executionResult.testsTotal,
      });

      // Update leaderboard (only for users who passed ALL tests)
      const allSubmissions = await Submission.find({ roomId })
        .sort({ submittedAt: 1 })
        .populate('userId', 'fullName email picture');

      // Get best submission per user (only if they passed ALL tests)
      const bestSubmissions = new Map();
      allSubmissions.forEach(sub => {
        if (sub.passed) { // Only include submissions that passed all tests
          const userId = sub.userId._id.toString();
          const current = bestSubmissions.get(userId);
          if (!current || sub.testsPassed > current.testsPassed) {
            bestSubmissions.set(userId, sub);
          }
        }
      });

      const rankings = rankingService.calculateRankings(
        Array.from(bestSubmissions.values()),
        room.startTime
      );

      const leaderboard = await rankingService.getLeaderboard(
        rankings,
        allSubmissions.map(s => s.userId)
      );

      // Save rankings to room with detailed reasons comparing to rank 1
      const firstPlace = leaderboard[0];
      
      room.rankings = leaderboard.map((entry, index) => {
        let rankReason = '';
        
        if (index === 0) {
          rankReason = 'Best performance - leading the competition';
        } else {
          const reasons = [];
          
          if (entry.testsPassed < firstPlace.testsPassed) {
            reasons.push(`Passed ${entry.testsPassed}/${entry.testsTotal || entry.testsPassed} tests vs rank 1's ${firstPlace.testsPassed}`);
          } else if (entry.submittedAt > firstPlace.submittedAt) {
            const timeDiff = Math.floor((new Date(entry.submittedAt) - new Date(firstPlace.submittedAt)) / 1000);
            reasons.push(`${timeDiff}s behind rank 1`);
          }
          
          if (entry.timeComplexity && firstPlace.timeComplexity && entry.timeComplexity !== firstPlace.timeComplexity) {
            const complexityOrder = {
              'O(1)': 1, 'O(log n)': 2, 'O(n)': 3, 'O(n log n)': 4,
              'O(n²)': 5, 'O(n²log n)': 6, 'O(n³)': 7, 'O(2^n)': 8, 'O(n!)': 9
            };
            const mineOrder = complexityOrder[entry.timeComplexity] || 10;
            const bestOrder = complexityOrder[firstPlace.timeComplexity] || 10;
            
            if (mineOrder > bestOrder) {
              reasons.push(`${entry.timeComplexity} vs rank 1's ${firstPlace.timeComplexity}`);
            }
          }
          
          if (entry.execTime > firstPlace.execTime) {
            const timeDiff = (entry.execTime - firstPlace.execTime).toFixed(0);
            reasons.push(`${timeDiff}ms slower`);
          }
          
          rankReason = reasons.length > 0 ? reasons.join('; ') : 'Behind rank 1';
        }
        
        return {
          userId: entry.userId,
          rank: index + 1,
          userName: entry.userName,
          passed: entry.passed || false,
          submittedAt: entry.submittedAt,
          timeComplexity: entry.timeComplexity,
          execTime: entry.execTime,
          testsPassed: entry.testsPassed,
          badges: entry.badges || [],
          rankReason: rankReason,
        };
      });
      await room.save();

      io.to(roomId).emit('leaderboard:update', { leaderboard: room.rankings });
    }

    // Find first failed test case
    const firstFailedTest = executionResult.results.findIndex(r => !r.passed);
    
    res.json({
      success: true,
      result: {
        passed: executionResult.passed,
        testsPassed: executionResult.testsPassed,
        testsTotal: executionResult.testsTotal,
        execTime: executionResult.execTime,
        timeComplexity: executionResult.timeComplexity,
        failedTestCase: firstFailedTest !== -1 ? firstFailedTest + 1 : null,
        failedReason: firstFailedTest !== -1 ? executionResult.results[firstFailedTest].error || 'Wrong Answer' : null,
        details: executionResult.results,
      },
    });
  } catch (error) {
    console.error('Error submitting code:', error);
    res.status(500).json({ error: error.message || 'Failed to submit code' });
  }
};

// Get leaderboard
exports.getLeaderboard = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Get all submissions for this room
    const submissions = await Submission.find({ roomId })
      .sort({ submittedAt: 1 })
      .populate('userId', 'fullName email picture');

    // Get best submission per user
    const bestSubmissions = new Map();
    submissions.forEach(sub => {
      const userId = sub.userId._id.toString();
      const current = bestSubmissions.get(userId);
      if (!current || sub.testsPassed > current.testsPassed) {
        bestSubmissions.set(userId, sub);
      }
    });

    const rankings = rankingService.calculateRankings(
      Array.from(bestSubmissions.values()),
      room.startTime
    );

    const leaderboard = await rankingService.getLeaderboard(
      rankings,
      submissions.map(s => s.userId)
    );

    res.json({
      success: true,
      leaderboard,
    });
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
};

// Finish room
exports.finishRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id;

    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Only room creator can finish the room' });
    }

    if (room.status === 'finished') {
      return res.status(400).json({ error: 'Room already finished' });
    }

    room.status = 'finished';
    room.endTime = new Date();

    // Calculate final rankings with detailed leaderboard
    const allSubmissions = await Submission.find({ roomId })
      .sort({ submittedAt: 1 })
      .populate('userId', 'fullName email picture');

    // Get best submission per user (only if they passed ALL tests)
    const bestSubmissions = new Map();
    allSubmissions.forEach(sub => {
      if (sub.passed) {
        const userId = sub.userId._id.toString();
        const current = bestSubmissions.get(userId);
        if (!current || sub.testsPassed > current.testsPassed) {
          bestSubmissions.set(userId, sub);
        }
      }
    });

    const rankings = rankingService.calculateRankings(
      Array.from(bestSubmissions.values()),
      room.startTime
    );

    const leaderboard = await rankingService.getLeaderboard(
      rankings,
      allSubmissions.map(s => s.userId)
    );

    // Save final rankings with detailed reasons comparing to rank 1
    const firstPlace = leaderboard[0]; // Reference for comparison
    
    room.rankings = leaderboard.map((entry, index) => {
      let rankReason = '';
      
      if (index === 0) {
        // Rank 1: The winner
        rankReason = 'Best performance - solved all test cases first with optimal solution';
      } else {
        // Compare with rank 1 to explain why this person ranked lower
        const reasons = [];
        
        // Compare test cases passed
        if (entry.testsPassed < firstPlace.testsPassed) {
          reasons.push(`Only passed ${entry.testsPassed}/${entry.testsTotal || entry.testsPassed} tests while rank 1 passed all ${firstPlace.testsPassed}`);
        }
        // If same tests passed, compare submission time
        else if (entry.submittedAt > firstPlace.submittedAt) {
          const timeDiff = Math.floor((new Date(entry.submittedAt) - new Date(firstPlace.submittedAt)) / 1000);
          reasons.push(`Submitted ${timeDiff}s later than rank 1`);
        }
        
        // Compare time complexity
        if (entry.timeComplexity && firstPlace.timeComplexity && 
            entry.timeComplexity !== firstPlace.timeComplexity) {
          const complexityOrder = {
            'O(1)': 1, 'O(log n)': 2, 'O(n)': 3, 'O(n log n)': 4,
            'O(n²)': 5, 'O(n²log n)': 6, 'O(n³)': 7, 'O(2^n)': 8, 'O(n!)': 9
          };
          const mineOrder = complexityOrder[entry.timeComplexity] || 10;
          const bestOrder = complexityOrder[firstPlace.timeComplexity] || 10;
          
          if (mineOrder > bestOrder) {
            reasons.push(`Less efficient algorithm (${entry.timeComplexity} vs rank 1's ${firstPlace.timeComplexity})`);
          }
        }
        
        // Compare execution time
        if (entry.execTime > firstPlace.execTime) {
          const timeDiff = (entry.execTime - firstPlace.execTime).toFixed(0);
          reasons.push(`Slower execution by ${timeDiff}ms compared to rank 1`);
        }
        
        // If no specific reasons found, provide a general one
        if (reasons.length === 0) {
          reasons.push('Overall performance not as strong as rank 1');
        }
        
        rankReason = reasons.join('; ');
      }
      
      return {
        userId: entry.userId,
        rank: index + 1,
        userName: entry.userName,
        passed: entry.passed || false,
        submittedAt: entry.submittedAt,
        timeComplexity: entry.timeComplexity,
        execTime: entry.execTime,
        testsPassed: entry.testsPassed,
        badges: entry.badges || [],
        rankReason: rankReason,
      };
    });
    
    await room.save();

    // Emit socket event with final leaderboard
    const io = req.app.get('io');
    if (io) {
      io.to(roomId).emit('room:finished', {
        rankings: room.rankings,
        leaderboard: room.rankings,
        endTime: room.endTime,
      });
    }

    res.json({
      success: true,
      rankings: room.rankings,
    });
  } catch (error) {
    console.error('Error finishing room:', error);
    res.status(500).json({ error: 'Failed to finish room' });
  }
};

// Get all questions
exports.getQuestions = async (req, res) => {
  try {
    // Return questions without testcases
    const questionsWithoutTestcases = questions.map(q => ({
      id: q.id,
      title: q.title,
      description: q.description,
      inputFormat: q.inputFormat,
      outputFormat: q.outputFormat,
      constraints: q.constraints,
      samples: q.samples,
    }));

    res.json({
      success: true,
      questions: questionsWithoutTestcases,
    });
  } catch (error) {
    console.error('Error getting questions:', error);
    res.status(500).json({ error: 'Failed to get questions' });
  }
};

// Get room details
exports.getRoomDetails = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findOne({ roomId })
      .populate('members', 'fullName email picture')
      .populate('createdBy', 'fullName email picture');

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json({
      success: true,
      room: {
        roomId: room.roomId,
        question: {
          id: room.question.id,
          title: room.question.title,
          description: room.question.description,
          inputFormat: room.question.inputFormat,
          outputFormat: room.question.outputFormat,
          constraints: room.question.constraints,
          samples: room.question.samples,
        },
        status: room.status,
        members: room.members,
        maxMembers: room.maxMembers,
        createdBy: room.createdBy,
        startTime: room.startTime,
        endTime: room.endTime,
        duration: room.duration,
        rankings: room.rankings,
      },
    });
  } catch (error) {
    console.error('Error getting room details:', error);
    res.status(500).json({ error: 'Failed to get room details' });
  }
};
