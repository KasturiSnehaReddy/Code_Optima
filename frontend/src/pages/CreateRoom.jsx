import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api_base_url, handleAuthError } from '../helper';
import Navbar from '../components/Navbar';
import { toast } from 'react-toastify';

const CreateRoom = () => {
  const [questions, setQuestions] = useState([]);
  const [selectedQuestion, setSelectedQuestion] = useState('');
  const [maxMembers, setMaxMembers] = useState(5);
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

  useEffect(() => {
    if (!isAuthChecking) {
      fetchQuestions();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthChecking]);

  const fetchQuestions = async () => {
    try {
      const response = await fetch(`${api_base_url}/rooms/questions`);
      const data = await response.json();
      if (data.success) {
        setQuestions(data.questions);
      }
    } catch (error) {
      toast.error('Failed to load questions');
    }
  };

  const handleCreateRoom = async () => {
    if (!selectedQuestion) {
      toast.error('Please select a question');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${api_base_url}/rooms/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          questionId: selectedQuestion,
          maxMembers: maxMembers 
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`Room created! Room ID: ${data.room.roomId}`);
        navigate(`/room/${data.room.roomId}`);
      } else {
        toast.error(data.error || 'Failed to create room');
      }
    } catch (error) {
      toast.error('Failed to create room');
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
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-white p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-xl p-8 border-2 border-teal-500">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Create Competitive Room</h1>
            <p className="text-gray-600 mb-8">Start a coding competition with up to 10 participants</p>

            <div className="space-y-6">
              <div>
                <label className="block text-gray-800 font-medium mb-3">Maximum Participants</label>
                <div className="flex items-center gap-4 mb-6">
                  <input
                    type="range"
                    min="2"
                    max="10"
                    value={maxMembers}
                    onChange={(e) => setMaxMembers(parseInt(e.target.value))}
                    className="flex-1 h-2 bg-teal-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="bg-teal-600 text-white font-bold px-4 py-2 rounded-lg min-w-[60px] text-center">
                    {maxMembers}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-gray-800 font-medium mb-3">Select a Problem</label>
                <div className="space-y-3">
                  {questions.map((question) => (
                    <div
                      key={question.id}
                      onClick={() => setSelectedQuestion(question.id)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedQuestion === question.id
                          ? 'border-teal-500 bg-teal-50 shadow-md'
                          : 'border-teal-200 bg-white hover:border-teal-400'
                      }`}
                    >
                      <h3 className="text-gray-800 font-semibold text-lg">{question.title}</h3>
                      <p className="text-gray-600 text-sm mt-1 line-clamp-2">{question.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {selectedQuestion && (
                <div className="bg-teal-50 p-4 rounded-lg border-2 border-teal-300">
                  <h3 className="text-gray-800 font-medium mb-2">Selected Problem Details</h3>
                  {questions.find(q => q.id === selectedQuestion) && (
                    <div className="text-gray-700 text-sm space-y-2">
                      <p><strong>Constraints:</strong> {questions.find(q => q.id === selectedQuestion).constraints}</p>
                      <p><strong>Input Format:</strong> {questions.find(q => q.id === selectedQuestion).inputFormat}</p>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleCreateRoom}
                disabled={loading || !selectedQuestion}
                className="w-full bg-gradient-to-r from-teal-600 to-teal-500 text-white font-bold py-4 px-6 rounded-lg hover:from-teal-700 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
              >
                {loading ? 'Creating Room...' : 'Create Room'}
              </button>

              <button
                onClick={() => navigate('/join-room')}
                className="w-full bg-white border-2 border-teal-500 text-teal-600 font-bold py-4 px-6 rounded-lg hover:bg-teal-50 transition-all"
              >
                Join Existing Room Instead
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CreateRoom;
