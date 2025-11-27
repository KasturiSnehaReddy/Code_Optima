import React, { useState, useEffect } from 'react'
import "./App.css";
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import NoPage from './pages/NoPage';
import SignUp from './pages/SignUp';
import Login from './pages/Login';
import Editor from './pages/Editor';
import CreateRoom from './pages/CreateRoom';
import JoinRoom from './pages/JoinRoom';
import Room from './pages/Room';
import RoomSummary from './pages/RoomSummary';
import Profile from './pages/Profile';
import Contact from './pages/Contact';

const App = () => {
  return (
    <>
      <BrowserRouter>
        <RouteHandler />
      </BrowserRouter>
    </>
  )
};

const RouteHandler = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(localStorage.getItem("isLoggedIn"));

  useEffect(() => {
    // Listen for storage changes
    const handleStorageChange = () => {
      setIsLoggedIn(localStorage.getItem("isLoggedIn"));
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also check on component mount
    setIsLoggedIn(localStorage.getItem("isLoggedIn"));

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return (
    <>
      <Routes>
        <Route path="/" element={isLoggedIn ? <Home /> : <Navigate to={"/login"}/>} />
        <Route path="/signUp" element={<SignUp />} />
        <Route path="/login" element={<Login />} />
        <Route path="/profile" element={isLoggedIn ? <Profile /> : <Navigate to={"/login"}/>} />
        <Route path="/contact" element={isLoggedIn ? <Contact /> : <Navigate to={"/login"}/>} />
        <Route path="/editor/:id" element={isLoggedIn ? <Editor /> : <Navigate to={"/login"}/>} />
        <Route path="/create-room" element={isLoggedIn ? <CreateRoom /> : <Navigate to={"/login"}/>} />
        <Route path="/join-room" element={isLoggedIn ? <JoinRoom /> : <Navigate to={"/login"}/>} />
        <Route path="/room/:roomId" element={isLoggedIn ? <Room /> : <Navigate to={"/login"}/>} />
        <Route path="/room-summary/:roomId" element={isLoggedIn ? <RoomSummary /> : <Navigate to={"/login"}/>} />
        <Route path="*" element={<NoPage />} />
      </Routes>
    </>
  )
}

export default App