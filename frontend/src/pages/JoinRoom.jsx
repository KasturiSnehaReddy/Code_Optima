import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api_base_url, handleAuthError } from '../helper';
import Navbar from '../components/Navbar';
import { toast } from 'react-toastify';

const JoinRoom = () => {
  const [roomId, setRoomId] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const navigate = useNavigate();

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

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    
    if (!roomId.trim()) {
      toast.error('Please enter a room ID');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${api_base_url}/rooms/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ roomId: roomId.trim().toUpperCase() }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Successfully joined the room!');
        navigate(`/room/${roomId.trim().toUpperCase()}`);
      } else {
        toast.error(data.error || 'Failed to join room');
      }
    } catch (error) {
      toast.error('Failed to join room');
    } finally {
      setLoading(false);
    }
  };

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white to-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-400 text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-white p-8 flex items-center justify-center">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-xl p-8 border-2 border-teal-500">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-800 mb-2">Join Room</h1>
              <p className="text-gray-600">Enter the room ID to join a competitive coding session</p>
            </div>

            <form onSubmit={handleJoinRoom} className="space-y-6">
              <div>
                <label className="block text-gray-800 font-medium mb-2">Room ID</label>
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  placeholder="e.g., A1B2C3D4"
                  className="w-full px-4 py-3 bg-teal-50 border-2 border-teal-300 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-center text-2xl font-mono tracking-wider"
                  maxLength={8}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !roomId.trim()}
                className="w-full bg-gradient-to-r from-teal-600 to-teal-500 text-white font-bold py-4 px-6 rounded-lg hover:from-teal-700 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
              >
                {loading ? 'Joining...' : 'Join Room'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => navigate('/create-room')}
                  className="text-teal-600 hover:text-teal-700 font-medium"
                >
                  Create a New Room Instead
                </button>
              </div>
            </form>
          </div>

          <div className="mt-6 bg-white/80 rounded-lg p-4 border-2 border-teal-300">
            <h3 className="text-gray-800 font-medium mb-2">📌 Instructions</h3>
            <ul className="text-gray-600 text-sm space-y-1">
              <li>• Get the room ID from the room creator</li>
              <li>• Room IDs are 8 characters long</li>
              <li>• Room will auto-start when full</li>
              <li>• Join before the host starts the session</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
};

export default JoinRoom;
