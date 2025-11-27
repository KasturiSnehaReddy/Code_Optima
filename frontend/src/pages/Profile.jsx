import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { api_base_url } from '../helper';
import { toast } from 'react-toastify';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Get user info
      const userResponse = await fetch(`${api_base_url}/getUserInfo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });
      const userData = await userResponse.json();
      
      if (userData.success) {
        setUser(userData.user);
        
        // Get user's session history
        console.log('Fetching sessions from:', `${api_base_url}/users/sessions`);
        const sessionsResponse = await fetch(`${api_base_url}/users/sessions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });
        
        console.log('Sessions response status:', sessionsResponse.status);
        const sessionsData = await sessionsResponse.json();
        console.log('Sessions data:', sessionsData);
        
        if (sessionsData.success) {
          setSessions(sessionsData.sessions);
        } else {
          console.error('Failed to get sessions:', sessionsData);
          toast.error(sessionsData.msg || sessionsData.error || 'Failed to load session history');
        }
      }
    } catch (error) {
      console.error('Profile fetch error:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-teal-50 to-white flex items-center justify-center">
          <div className="text-teal-600 text-2xl">Loading profile...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-white py-8 px-6">
        <div className="max-w-6xl mx-auto">
          {/* User Info Card */}
          <div className="bg-white rounded-lg shadow-lg border-2 border-teal-500 p-6 mb-6">
            <div className="flex items-center gap-4">
              {user?.picture && (
                <img 
                  src={user.picture} 
                  alt={user.fullName} 
                  className="w-20 h-20 rounded-full border-4 border-teal-500"
                />
              )}
              <div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">{user?.fullName}</h1>
                <p className="text-gray-600">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Session History */}
          <div className="bg-white rounded-lg shadow-lg border-2 border-teal-500 p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="text-3xl">🏆</span> Session History
            </h2>
            
            {sessions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No sessions participated yet</p>
            ) : (
              <div className="space-y-4">
                {sessions.map((session, idx) => (
                  <div 
                    key={idx} 
                    className="bg-teal-50 border-2 border-teal-300 rounded-lg p-4 hover:border-teal-500 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800">{session.questionTitle}</h3>
                        <p className="text-sm text-gray-600">Room: {session.roomId}</p>
                      </div>
                      <div className="text-right">
                        {session.rank ? (
                          <div className={`text-2xl font-bold ${
                            session.rank === 1 ? 'text-yellow-500' :
                            session.rank === 2 ? 'text-gray-500' :
                            session.rank === 3 ? 'text-orange-500' :
                            'text-teal-600'
                          }`}>
                            #{session.rank}
                          </div>
                        ) : (
                          <div className="text-red-500 text-sm font-semibold">Did not pass</div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Status: </span>
                        <span className={session.passed ? 'text-green-600 font-semibold' : 'text-red-500 font-semibold'}>
                          {session.passed ? '✅ Passed' : '❌ Failed'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Tests Passed: </span>
                        <span className="text-gray-800 font-semibold">{session.testsPassed}/{session.testsTotal}</span>
                      </div>
                      {session.timeComplexity && (
                        <div>
                          <span className="text-gray-600">Complexity: </span>
                          <span className="text-teal-600 font-semibold">{session.timeComplexity}</span>
                        </div>
                      )}
                      {session.execTime && (
                        <div>
                          <span className="text-gray-600">Execution: </span>
                          <span className="text-gray-800 font-semibold">{session.execTime.toFixed(0)}ms</span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-600">Date: </span>
                        <span className="text-gray-800">
                          {new Date(session.submittedAt).toLocaleDateString()}
                        </span>
                      </div>
                      {session.rankReason && (
                        <div className="col-span-2">
                          <span className="text-gray-600">Rank Reason: </span>
                          <span className="text-gray-700 italic">{session.rankReason}</span>
                        </div>
                      )}
                    </div>

                    {session.badges && session.badges.length > 0 && (
                      <div className="mt-3 flex gap-2">
                        {session.badges.map((badge, i) => (
                          <span 
                            key={i} 
                            className="bg-teal-100 text-teal-700 border border-teal-400 px-3 py-1 rounded-full text-xs font-semibold"
                          >
                            🏅 {badge}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Profile;
