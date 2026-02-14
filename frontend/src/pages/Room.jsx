import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api_base_url, handleAuthError } from '../helper';
import { toast } from 'react-toastify';
import Editor from '@monaco-editor/react';
import io from 'socket.io-client';

const Room = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('python');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [running, setRunning] = useState(false);
  const [runResults, setRunResults] = useState(null);
  const [submitResults, setSubmitResults] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [timeLeft, setTimeLeft] = useState('1:00:00');
  const [isCreator, setIsCreator] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const socketRef = useRef(null);

  const languageTemplates = {
    python: '# Write your solution here\n\ndef solve():\n    pass\n\nsolve()',
    javascript: '// Write your solution here\n\nfunction solve() {\n    \n}\n\nsolve();',
    cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    return 0;\n}',
    c: '#include <stdio.h>\n\nint main() {\n    // Write your solution here\n    return 0;\n}',
    java: 'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        // Write your solution here\n    }\n}',
  };

  // Check authentication first
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const response = await fetch(`${api_base_url}/getUserInfo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });
        
        const data = await response.json();
        
        if (response.status === 401 || !data.success) {
          localStorage.clear();
          navigate('/login');
          return;
        }
        
        setIsAuthChecking(false);
      } catch (error) {
        localStorage.clear();
        navigate('/login');
      }
    };

    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (!isAuthChecking) {
      fetchRoomDetails();
      connectSocket();

      // Prevent accidental page close
      const handleBeforeUnload = (e) => {
        if (room?.status === 'running') {
          e.preventDefault();
          e.returnValue = 'Are you sure you want to leave the room? Your progress will be lost.';
          return e.returnValue;
        }
      };

      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        if (socketRef.current) {
          socketRef.current.emit('leave-room', roomId);
          socketRef.current.disconnect();
        }
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthChecking]);

  useEffect(() => {
    if (room && room.status === 'running' && room.endTime) {
      const interval = setInterval(() => {
        const now = new Date().getTime();
        const end = new Date(room.endTime).getTime();
        const remaining = Math.max(0, end - now);
        
        if (remaining === 0) {
          // Time's up - room will auto-finish
          clearInterval(interval);
        }
        
        const hours = Math.floor(remaining / 3600000);
        const minutes = Math.floor((remaining % 3600000) / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        
        // Show format based on remaining time (hide hours if less than 1 hour)
        if (hours > 0) {
          setTimeLeft(`${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        } else {
          setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [room]);

  const connectSocket = () => {
    socketRef.current = io(api_base_url);
    
    socketRef.current.on('connect', () => {
      console.log('Socket connected');
      socketRef.current.emit('join-room', roomId);
    });

    socketRef.current.on('room:joined', (data) => {
      toast.info('A new participant joined the room');
      fetchRoomDetails();
    });

    socketRef.current.on('member:left', (data) => {
      toast.info('A participant left the room');
      fetchRoomDetails();
    });

    socketRef.current.on('room:started', (data) => {
      toast.success('Room started! Time limit: 1 minute ⏱️');
      fetchRoomDetails();
    });

    socketRef.current.on('submission:received', (data) => {
      toast.info('A participant submitted their solution');
    });

    socketRef.current.on('leaderboard:update', (data) => {
      setLeaderboard(data.leaderboard);
    });

    socketRef.current.on('room:finished', (data) => {
      // Update leaderboard with final rankings
      if (data.leaderboard && data.leaderboard.length > 0) {
        setLeaderboard(data.leaderboard);
      }
      toast.success('Session ended! Showing final results...');
      setTimeout(() => {
        navigate(`/room-summary/${roomId}`);
      }, 3000);
    });
  };

  const fetchRoomDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${api_base_url}/rooms/${roomId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      
      // Handle auth errors
      if (handleAuthError(response, data)) return;
      
      if (data.success) {
        setRoom(data.room);
        setCode(languageTemplates[language]);
        
        // Load saved rankings (persisted even if users leave)
        if (data.room.rankings && data.room.rankings.length > 0) {
          setLeaderboard(data.room.rankings);
        }
        
        // Check if current user is the creator
        const userResponse = await fetch(`${api_base_url}/getUserInfo`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });
        const userData = await userResponse.json();
        if (userData.success) {
          setIsCreator(data.room.createdBy._id === userData.user._id);
        }
      } else {
        toast.error(data.error);
        navigate('/');
      }
    } catch (error) {
      toast.error('Failed to load room details');
    } finally {
      setLoading(false);
    }
  };

  const handleStartRoom = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${api_base_url}/rooms/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ roomId }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Room started!');
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error('Failed to start room');
    }
  };

  const handleRun = async () => {
    // Check if time is up
    if (room?.status === 'running' && room?.endTime) {
      const now = new Date().getTime();
      const end = new Date(room.endTime).getTime();
      if (now >= end) {
        toast.error('⏰ Time is up! You can no longer run code. Please leave the session.');
        return;
      }
    }

    if (!code.trim()) {
      toast.error('Please write some code first');
      return;
    }

    setRunning(true);
    setRunResults(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${api_base_url}/rooms/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ roomId, code, language }),
      });

      const data = await response.json();
      if (data.success) {
        setRunResults(data.result);
        const passed = data.result.results.filter(r => r.passed).length;
        const total = data.result.results.length;
        if (passed === total) {
          toast.success(`✅ All sample tests passed! (${passed}/${total})`);
        } else {
          toast.warning(`⚠️ ${passed}/${total} sample tests passed`);
        }
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error('Failed to run code');
    } finally {
      setRunning(false);
    }
  };

  const handleSubmit = async () => {
    // Check if time is up
    if (room?.status === 'running' && room?.endTime) {
      const now = new Date().getTime();
      const end = new Date(room.endTime).getTime();
      if (now >= end) {
        toast.error('⏰ Time is up! You can no longer submit code. Please leave the session.');
        return;
      }
    }

    if (!code.trim()) {
      toast.error('Please write some code first');
      return;
    }

    setSubmitting(true);
    setRunResults(null);
    setSubmitResults(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${api_base_url}/rooms/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ roomId, code, language }),
      });

      const data = await response.json();
      if (data.success) {
        const result = data.result;
        setSubmitResults(result);
        
        if (result.passed) {
          toast.success(`✅ All tests passed! (${result.testsPassed}/${result.testsTotal})`);
        } else {
          toast.error(`❌ Failed at Test Case ${result.failedTestCase}/${result.testsTotal}`);
        }
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error('Failed to submit code');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinishRoom = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${api_base_url}/rooms/${roomId}/finish`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Room finished!');
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error('Failed to finish room');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleBackClick = () => {
    setShowExitConfirm(true);
  };

  const confirmExit = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${api_base_url}/rooms/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ roomId }),
      });

      if (socketRef.current) {
        socketRef.current.emit('leave-room', roomId);
      }
      navigate('/');
    } catch (error) {
      console.error('Error leaving room:', error);
      navigate('/');
    }
  };

  const cancelExit = () => {
    setShowExitConfirm(false);
  };

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-2xl">Checking authentication...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-2xl">Loading room...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBackClick}
            className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded text-sm"
          >
            ← Back
          </button>
          <div className="flex items-center gap-2">
            <div>
              <h1 className="text-white text-lg font-bold">Room: {roomId}</h1>
              <p className="text-gray-400 text-xs">{room?.question?.title}</p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(roomId);
                toast.success('Room ID copied to clipboard!');
              }}
              className="bg-gray-700 hover:bg-gray-600 text-gray-300 p-1.5 rounded text-xs"
              title="Copy Room ID"
            >
              📋
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {timeLeft && (
            <div className="bg-blue-900/50 px-3 py-1.5 rounded">
              <span className="text-blue-300 font-mono text-sm">{timeLeft}</span>
            </div>
          )}
          
          <div className="relative">
            <div className="bg-gray-700 px-3 py-1.5 rounded cursor-pointer hover:bg-gray-600 transition-colors peer">
              <span className="text-gray-300 text-sm">👥 {room?.members?.length || 0}/{room?.maxMembers || 10}</span>
            </div>
            {/* Tooltip on hover - shows below */}
            {room?.members && room.members.length > 0 && (
              <div className="absolute invisible peer-hover:visible top-full mt-2 right-0 bg-gray-900 text-white text-xs rounded-lg py-3 px-4 shadow-2xl border-2 border-blue-500 w-52 z-50">
                <div className="font-semibold mb-2 text-blue-400 border-b border-gray-700 pb-1.5">Participants:</div>
                {room.members.map((member, idx) => {
                  const displayName = typeof member === 'string' 
                    ? 'Loading...' 
                    : (member?.fullName || member?.email || 'Anonymous');
                  return (
                    <div key={idx} className="text-gray-200 py-1 flex items-center gap-1">
                      <span className="text-green-400">✓</span> {displayName}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {room?.status === 'open' && isCreator && (
            <button
              onClick={handleStartRoom}
              className="bg-green-600 hover:bg-green-700 text-white font-medium py-1.5 px-4 rounded text-sm"
            >
              Start Room
            </button>
          )}
        </div>
      </div>

      {/* Main Content - LeetCode Style: Problem Left, Editor Right */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Problem Description */}
        <div className="w-2/5 border-r border-gray-700 flex flex-col">
          <div className="flex-1 overflow-y-auto p-5">
            <h2 className="text-white text-xl font-bold mb-3">{room?.question?.title}</h2>
            <p className="text-gray-300 mb-5 leading-relaxed">{room?.question?.description}</p>
            
            {/* Important Note */}
            <div className="bg-yellow-900/20 border border-yellow-600/30 p-3 rounded-lg mb-4">
              <div className="text-yellow-300 font-semibold mb-1 text-sm">💡 How to Write Your Code</div>
              <p className="text-yellow-200 text-xs mb-2">
                Your code should read input from <strong>standard input (stdin)</strong> and print output to <strong>standard output (stdout)</strong>.
              </p>
              <div className="text-yellow-200 text-xs space-y-1">
                <div><strong>Python:</strong> <code className="bg-gray-800 px-1 py-0.5 rounded">n = int(input())</code></div>
                <div><strong>Java:</strong> <code className="bg-gray-800 px-1 py-0.5 rounded">Scanner sc = new Scanner(System.in); int n = sc.nextInt();</code></div>
                <div><strong>C++:</strong> <code className="bg-gray-800 px-1 py-0.5 rounded">int n; cin &gt;&gt; n;</code></div>
                <div><strong>C:</strong> <code className="bg-gray-800 px-1 py-0.5 rounded">int n; scanf("%d", &amp;n);</code></div>
                <div><strong>JavaScript:</strong> <code className="bg-gray-800 px-1 py-0.5 rounded">const input = require('fs').readFileSync(0, 'utf-8');</code></div>
              </div>
            </div>
            
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-gray-400 font-semibold mb-1">Input Format:</div>
                <div className="text-gray-300">{room?.question?.inputFormat}</div>
              </div>
              <div>
                <div className="text-gray-400 font-semibold mb-1">Output Format:</div>
                <div className="text-gray-300">{room?.question?.outputFormat}</div>
              </div>
              
              {/* Evaluation Criteria */}
              <div className="bg-blue-900/20 border border-blue-600/30 p-3 rounded-lg">
                <div className="text-blue-300 font-semibold mb-2 text-xs">📊 Evaluation Criteria (Ranked by Priority)</div>
                <ol className="text-gray-300 text-xs space-y-1 ml-4 list-decimal">
                  <li>Number of test cases passed (higher is better)</li>
                  <li>Submission time (earlier is better)</li>
                  <li>Time complexity (lower is better)</li>
                  <li>Execution time (faster is better)</li>
                </ol>
              </div>

              <div>
                <div className="text-gray-400 font-semibold mb-2">Examples:</div>
                {room?.question?.samples?.map((sample, idx) => (
                  <div key={idx} className="bg-gray-800 p-3 rounded-lg mb-2">
                    <div className="mb-1">
                      <span className="text-gray-500 text-xs">Input: </span>
                      <code className="text-green-400">{sample.input}</code>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs">Output: </span>
                      <code className="text-blue-400">{sample.output}</code>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Editor + Bottom Panel */}
        <div className="flex-1 flex flex-col">
          {/* Code Editor */}
          <div className="flex-1 flex flex-col relative">
            <div className="bg-gray-800 px-4 py-2 flex items-center justify-between border-b border-gray-700">
              <select
                value={language}
                onChange={(e) => {
                  setLanguage(e.target.value);
                  setCode(languageTemplates[e.target.value]);
                }}
                className="bg-gray-700 text-white px-3 py-1.5 rounded text-sm"
                disabled={room?.status !== 'running'}
              >
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="cpp">C++</option>
                <option value="c">C</option>
                <option value="java">Java</option>
              </select>

              <div className="flex gap-2">
                <button
                  onClick={handleRun}
                  disabled={running || room?.status !== 'running'}
                  className="bg-gray-700 hover:bg-gray-600 text-white font-medium py-1.5 px-4 rounded text-sm disabled:opacity-50"
                >
                  {running ? 'Running...' : '▶ Run'}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || room?.status !== 'running'}
                  className="bg-green-600 hover:bg-green-700 text-white font-medium py-1.5 px-4 rounded text-sm disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </div>

            <Editor
              height="100%"
              language={language === 'cpp' ? 'cpp' : language}
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                readOnly: room?.status !== 'running',
                contextmenu: room?.status === 'running',
              }}
            />
            {room?.status === 'open' && (
              <div className="absolute inset-0 bg-gray-900/90 flex items-center justify-center">
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 text-center">
                  <p className="text-white text-lg mb-1">⏳ Waiting for participants...</p>
                  <p className="text-gray-400 text-sm">Editor unlocks when room is full</p>
                  <div className="mt-3">
                    <p className="text-blue-400 font-bold text-2xl">{room.members.length}/{room.maxMembers}</p>
                    {room.members && room.members.length > 0 && (
                      <div className="mt-2 text-gray-400 text-sm">
                        {room.members.map((member, idx) => (
                          <div key={idx}>
                            ✓ {member.fullName || member.email}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom: Test Results + Leaderboard */}
          <div className="h-56 border-t border-gray-700 flex">
            {/* Test Results */}
            <div className="flex-1 overflow-y-auto bg-gray-800/30 p-4 border-r border-gray-700">
              <h3 className="text-white text-sm font-bold mb-3">Test Results</h3>
              
              {/* Show Run Results */}
              {!submitResults && !runResults && (
                <p className="text-gray-500 text-sm">Click Run to test your code</p>
              )}
              
              {/* Show Submit Results (Failed Test Cases) */}
              {submitResults && (
                <div className="space-y-2">
                  {submitResults.passed ? (
                    <div className="p-3 rounded border bg-green-900/20 border-green-600/50 text-sm">
                      <div className="text-green-400 font-semibold mb-2">✅ All Test Cases Passed!</div>
                      <div className="text-xs text-gray-300 space-y-1">
                        <div>Tests: {submitResults.testsPassed}/{submitResults.testsTotal}</div>
                        <div>Time: {submitResults.execTime?.toFixed(0)}ms</div>
                        <div>Complexity: {submitResults.timeComplexity}</div>
                      </div>
                    </div>
                  ) : (
                    submitResults.details?.map((result, idx) => {
                      if (result.passed) return null;
                      return (
                        <div key={idx} className="p-3 rounded border bg-red-900/20 border-red-600/50 text-xs">
                          <div className="text-red-400 font-semibold mb-2">
                            ❌ Test Case {idx + 1} Failed
                          </div>
                          <div className="space-y-1.5">
                            <div>
                              <span className="text-gray-400">Input: </span>
                              <code className="text-white bg-gray-900/50 px-1.5 py-0.5 rounded">{result.input}</code>
                            </div>
                            <div>
                              <span className="text-gray-400">Expected: </span>
                              <code className="text-green-400 bg-gray-900/50 px-1.5 py-0.5 rounded">{result.expectedOutput}</code>
                            </div>
                            <div>
                              <span className="text-gray-400">Your Output: </span>
                              <code className="text-red-400 bg-gray-900/50 px-1.5 py-0.5 rounded">{result.actualOutput || 'No output'}</code>
                            </div>
                            {result.error && (
                              <div className="text-red-300 mt-2 text-xs bg-red-900/30 p-2 rounded">
                                Error: {result.error}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
              
              {/* Show Run Results (Sample Test Cases) */}
              {!submitResults && runResults && (
                <div className="space-y-2">
                  {runResults.results.map((result, idx) => (
                    <div key={idx} className={`p-2 rounded border text-xs ${
                      result.passed 
                        ? 'bg-green-900/20 border-green-600/50' 
                        : 'bg-red-900/20 border-red-600/50'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white font-medium">
                          {result.passed ? '✅' : '❌'} Test {idx + 1}
                        </span>
                        <span className={result.passed ? 'text-green-400' : 'text-red-400'}>
                          {result.passed ? 'Passed' : 'Failed'}
                        </span>
                      </div>
                      {!result.passed && (
                        <div className="text-xs space-y-0.5 mt-1">
                          <div className="text-gray-400">Expected: <span className="text-white">{result.expectedOutput}</span></div>
                          <div className="text-gray-400">Got: <span className="text-white">{result.actualOutput || 'No output'}</span></div>
                          {result.error && <div className="text-red-400 text-xs mt-1">{result.error}</div>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Leaderboard */}
            <div className="w-72 overflow-y-auto bg-gray-800/30 p-4">
              <h3 className="text-white text-sm font-bold mb-3 flex items-center gap-1">
                🏆 Leaderboard
              </h3>
              {leaderboard.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-6">No submissions yet</p>
              ) : (
                <div className="space-y-1.5">
                  {leaderboard.map((entry, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded flex flex-col text-xs ${
                        idx === 0 ? 'bg-yellow-900/30 border border-yellow-600/50' :
                        idx === 1 ? 'bg-gray-700/40 border border-gray-500/50' :
                        idx === 2 ? 'bg-orange-900/30 border border-orange-600/50' :
                        'bg-gray-700/20'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold text-sm">#{idx + 1}</span>
                          <span className="text-white text-xs">{entry.userName}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-green-400 text-xs">
                            {entry.timeComplexity || 'O(n)'}
                          </div>
                          <div className="text-gray-400 text-xs">
                            {entry.execTime?.toFixed(0)}ms
                          </div>
                        </div>
                      </div>
                      {entry.rankReason && (
                        <div className="text-gray-400 text-xs mt-1 italic">
                          {entry.rankReason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-8 max-w-md border border-gray-700">
            <h3 className="text-white text-2xl font-bold mb-4">⚠️ Leave Room?</h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to leave the room? 
              {room?.status === 'running' && (
                <span className="block mt-2 text-yellow-400 font-semibold">
                  ⚠️ Your progress gets saved only if you submit!
                </span>
              )}
            </p>
            <div className="flex gap-4">
              <button
                onClick={cancelExit}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-all"
              >
                Stay in Room
              </button>
              <button
                onClick={confirmExit}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-all"
              >
                Leave Room
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Room;
