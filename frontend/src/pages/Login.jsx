import React, { useState, useEffect } from 'react';
import logo from "../images/logos/logo.png"
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { api_base_url } from '../helper';

const Login = () => {

  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);

  const navigate = useNavigate();

  const handleGoogleLogin = async (response) => {
    try {
      // Send the Google token to your backend
      const res = await fetch(api_base_url + "/googleLogin", {
        mode: "cors",
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          token: response.credential
        })
      });

      const data = await res.json();
      
      if (data.success) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("userId", data.userId);
        localStorage.setItem("isLoggedIn", true);
        toast.success("Login successful!");
        setTimeout(() => {
          window.location.href = "/";
        }, 500);
      } else {
        toast.error(data.msg);
      }
    } catch (error) {
      console.error('Google login error:', error);
      toast.error('Google login failed. Please try again.');
    }
  };

  // Load Google Identity Services
  useEffect(() => {
    const initializeGoogle = () => {
      if (window.google && window.google.accounts) {
        window.google.accounts.id.initialize({
          client_id: "734125075420-di6ba69cgosfrf0fk6c8q90kp6kaiulb.apps.googleusercontent.com",
          callback: handleGoogleLogin
        });
        
        // Add a small delay to ensure DOM is ready
        setTimeout(() => {
          const buttonElement = document.getElementById("google-signin-button");
          if (buttonElement) {
            window.google.accounts.id.renderButton(
              buttonElement,
              {
                theme: "outline",
                size: "large",
                width: 320,
                text: "signin_with"
              }
            );
            setIsGoogleLoaded(true);
          }
        }, 100);
      }
    };

    const loadGoogleScript = () => {
      // Check if already loaded
      if (window.google && window.google.accounts) {
        initializeGoogle();
        return;
      }
      
      // Check if script already exists
      if (document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
        // Wait for it to load
        const checkGoogle = setInterval(() => {
          if (window.google && window.google.accounts) {
            clearInterval(checkGoogle);
            initializeGoogle();
          }
        }, 100);
        return;
      }
      
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        initializeGoogle();
      };
      script.onerror = () => {
        console.error('Failed to load Google Identity Services');
      };
      document.head.appendChild(script);
    };

    loadGoogleScript();
  }, []);

  const submitForm = (e) => {
    e.preventDefault();
    fetch(api_base_url + "/login", {
      mode: "cors",
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: email,
        pwd: pwd
      })
    }).then(res => res.json()).then(data => {
      if (data.success) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("isLoggedIn", true);
        toast.success("Login successful!");
        setTimeout(() => {
          window.location.href = "/";
        }, 500);
      }
      else {
        toast.error(data.msg);
      }
    })
  };

  return (
    <>
      <div className="con flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-teal-50 to-white">
        <form onSubmit={submitForm} className='w-[400px] h-[auto] flex flex-col items-center bg-white p-[40px] rounded-2xl shadow-2xl border border-gray-100'>
          <img className='w-[200px] object-cover mb-8' src={logo} alt="" />
          
          <h2 className="text-2xl font-bold text-gray-800 mb-8">Welcome Back</h2>

          <div className="inputBox w-full">
            <input onChange={(e) => { setEmail(e.target.value) }} value={email} type="email" placeholder='Email Address' required />
          </div>

          <div className="inputBox w-full">
            <input onChange={(e) => { setPwd(e.target.value) }} value={pwd} type="password" placeholder='Password' required />
          </div>

          <p className='text-gray-600 text-sm mt-6 self-start'>
            Don't have an account? {' '}
            <Link to="/signUp" className='text-custom-teal font-semibold hover:text-custom-teal-dark transition-colors'>
              Sign Up
            </Link>
          </p>

          <button className="btnNormal mt-6 bg-custom-teal text-white transition-all hover:bg-custom-teal-dark">
            Sign In
          </button>

          {/* Divider */}
          <div className="flex items-center w-full my-6">
            <div className="flex-1 border-t border-gray-300"></div>
            <span className="px-4 text-gray-500 text-sm">OR</span>
            <div className="flex-1 border-t border-gray-300"></div>
          </div>

          {/* Google Sign-In Button */}
          <div className="w-full flex justify-center">
            {!isGoogleLoaded ? (
              <div className="w-full max-w-xs h-[40px] bg-gray-100 rounded border flex items-center justify-center">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-custom-teal"></div>
                  <span className="text-gray-600 text-sm">Loading Google Sign-In...</span>
                </div>
              </div>
            ) : null}
            <div id="google-signin-button" className="w-full max-w-xs"></div>
          </div>
          
        </form>
      </div>
    </>
  )
}

export default Login