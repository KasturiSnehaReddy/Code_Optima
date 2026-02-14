import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api_base_url, handleAuthError } from '../helper';
import { toast } from 'react-toastify';
import Navbar from '../components/Navbar';

const RoomSummary = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

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
      fetchCurrentUser();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, isAuthChecking]);

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${api_base_url}/users/getUserInfo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });
      const data = await response.json();
      if (data.success) {
        setCurrentUserId(data.user._id);
      }
    } catch (error) {
      console.error('Failed to fetch user info');
    }
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
      if (data.success) {
        setRoom(data.room);
      } else {
        toast.error(data.error);
        navigate('/');
      }
    } catch (error) {
      toast.error('Failed to load room summary');
    } finally {
      setLoading(false);
    }
  };

  const getBadgeIcon = (badgeName) => {
    const badges = {
      'first-solver': '🥇',
      'best-complexity': '⚡',
      'zero-wrong-attempts': '🎯',
      'top-3': '🏆',
    };
    return badges[badgeName] || '🎖️';
  };

  const getBadgeColor = (rank) => {
    if (rank === 1) return 'from-yellow-500 to-yellow-600';
    if (rank === 2) return 'from-gray-400 to-gray-500';
    if (rank === 3) return 'from-orange-600 to-orange-700';
    return 'from-blue-600 to-blue-700';
  };

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-white text-2xl">Loading summary...</div>
        </div>
      </>
    );
  }

  const userRanking = room?.rankings?.find(r => r.userId === currentUserId);

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-white mb-2">🎉 Competition Complete!</h1>
            <p className="text-gray-400 text-lg">Room ID: {roomId}</p>
            <p className="text-gray-500">{room?.question?.title}</p>
          </div>

          {/* User's Performance Card */}
          {userRanking && (
            <div className={`bg-gradient-to-r ${getBadgeColor(userRanking.rank)} p-6 rounded-lg shadow-2xl mb-8 border-2 border-white/20`}>
              <div className="text-center">
                <div className="text-6xl mb-2">
                  {userRanking.rank === 1 ? '🥇' : userRanking.rank === 2 ? '🥈' : userRanking.rank === 3 ? '🥉' : '🏅'}
                </div>
                <h2 className="text-white text-3xl font-bold mb-2">Your Rank: #{userRanking.rank}</h2>
                <div className="flex justify-center gap-4 text-white text-lg">
                  <div>
                    <span className="font-semibold">Status:</span> {userRanking.passed ? '✅ Passed' : '❌ Failed'}
                  </div>
                  <div>
                    <span className="font-semibold">Complexity:</span> {userRanking.timeComplexity}
                  </div>
                  <div>
                    <span className="font-semibold">Time:</span> {userRanking.execTime?.toFixed(2)}ms
                  </div>
                </div>
                
                {userRanking.badges && userRanking.badges.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-white text-xl font-semibold mb-2">Badges Earned 🎖️</h3>
                    <div className="flex justify-center gap-3">
                      {userRanking.badges.map((badge, idx) => (
                        <div key={idx} className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                          <span className="text-2xl">{getBadgeIcon(badge)}</span>
                          <p className="text-white text-sm mt-1">{badge.replace(/-/g, ' ')}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Final Leaderboard */}
          <div className="bg-gray-800 rounded-lg shadow-xl p-6 border border-gray-700">
            <h2 className="text-white text-2xl font-bold mb-6">🏆 Final Leaderboard</h2>
            
            <div className="space-y-3">
              {room?.rankings?.map((ranking, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg transition-all ${
                    ranking.userId === currentUserId
                      ? 'bg-blue-900/40 border-2 border-blue-500'
                      : idx === 0
                      ? 'bg-yellow-900/30 border border-yellow-600/50'
                      : idx === 1
                      ? 'bg-gray-700/50 border border-gray-500/50'
                      : idx === 2
                      ? 'bg-orange-900/30 border border-orange-600/50'
                      : 'bg-gray-700/30 border border-gray-600/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-3xl">
                        {ranking.rank === 1 ? '🥇' : ranking.rank === 2 ? '🥈' : ranking.rank === 3 ? '🥉' : `#${ranking.rank}`}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-white font-semibold text-lg">
                            Participant {idx + 1}
                            {ranking.userId === currentUserId && <span className="text-blue-400 text-sm ml-2">(You)</span>}
                          </h3>
                          {ranking.passed && <span className="text-green-400">✅</span>}
                        </div>
                        <div className="text-gray-400 text-sm">
                          {ranking.timeComplexity} • {ranking.execTime?.toFixed(2)}ms
                        </div>
                      </div>
                    </div>

                    {ranking.badges && ranking.badges.length > 0 && (
                      <div className="flex gap-2">
                        {ranking.badges.map((badge, i) => (
                          <div key={i} className="bg-purple-900/50 px-3 py-1 rounded-full flex items-center gap-1">
                            <span className="text-lg">{getBadgeIcon(badge)}</span>
                            <span className="text-purple-300 text-xs">{badge.replace(/-/g, ' ')}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4 mt-8">
            <button
              onClick={() => navigate('/create-room')}
              className="bg-gradient-to-r from-green-600 to-blue-600 text-white font-bold py-3 px-8 rounded-lg hover:from-green-700 hover:to-blue-700 transition-all shadow-lg"
            >
              Create New Room
            </button>
            <button
              onClick={() => navigate('/')}
              className="bg-gray-700 text-white font-bold py-3 px-8 rounded-lg hover:bg-gray-600 transition-all"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default RoomSummary;
