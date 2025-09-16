import React, { useState, useEffect } from 'react';
import logo from "../images/logos/logo.png"
import { Link, useNavigate } from 'react-router-dom';
import { api_base_url } from '../helper';
import { toast } from 'react-toastify';

const SignUp = () => {

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);

  const navigate = useNavigate();

  const handleGoogleSignup = async (response) => {
    try {
      // Send the Google token to your backend
      const res = await fetch(api_base_url + "/googleSignup", {
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
        toast.success("Account created successfully!");
        navigate("/login");
      } else {
        toast.error(data.msg);
      }
    } catch (error) {
      console.error('Google signup error:', error);
      toast.error('Google signup failed. Please try again.');
    }
  };

  // Load Google Identity Services
  useEffect(() => {
    const initializeGoogle = () => {
      if (window.google && window.google.accounts) {
        window.google.accounts.id.initialize({
          client_id: "734125075420-di6ba69cgosfrf0fk6c8q90kp6kaiulb.apps.googleusercontent.com",
          callback: handleGoogleSignup
        });
        
        // Add a small delay to ensure DOM is ready
        setTimeout(() => {
          const buttonElement = document.getElementById("google-signup-button");
          if (buttonElement) {
            window.google.accounts.id.renderButton(
              buttonElement,
              {
                theme: "outline",
                size: "large",
                width: 320,
                text: "signup_with"
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
    fetch(api_base_url + "/signUp",{
      mode: "cors",
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        fullName: fullName,
        email: email,
        pwd: pwd
      })
    }).then(res => res.json()).then(data => {
      if(data.success){
        navigate("/login");
      }
      else{
        toast.error(data.msg);
      }
    })
  };

  return (
    <>
      <div className="con flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-teal-50 to-white">
        <form onSubmit={submitForm} className='w-[400px] h-[auto] flex flex-col items-center bg-white p-[40px] rounded-2xl shadow-2xl border border-gray-100'>
          <img className='w-[200px] object-cover mb-8' src={logo} alt="" />
          
          <h2 className="text-2xl font-bold text-gray-800 mb-8">Create Account</h2>

          <div className="inputBox w-full">
            <input onChange={(e)=>{setFullName(e.target.value)}} value={fullName} type="text" placeholder='Full Name' required/>
          </div>

          <div className="inputBox w-full">
            <input onChange={(e)=>{setEmail(e.target.value)}} value={email} type="email" placeholder='Email Address' required/>
          </div>

          <div className="inputBox w-full">
            <input onChange={(e)=>{setPwd(e.target.value)}} value={pwd} type="password" placeholder='Password' required/>
          </div>

          <p className='text-gray-600 text-sm mt-6 self-start'>
            Already have an account? {' '}
            <Link to="/login" className='text-custom-teal font-semibold hover:text-custom-teal-dark transition-colors'>
              Login
            </Link>
          </p>

          <button className="btnNormal mt-6 bg-custom-teal text-white transition-all hover:bg-custom-teal-dark">
            Create Account
          </button>

          <div className="flex items-center justify-center my-4">
            <hr className="flex-grow border-gray-300" />
            <span className="px-3 text-gray-500 text-sm">OR</span>
            <hr className="flex-grow border-gray-300" />
          </div>

          <div className="w-full flex justify-center">
            {!isGoogleLoaded ? (
              <div className="w-full max-w-xs h-[40px] bg-gray-100 rounded border flex items-center justify-center">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-custom-teal"></div>
                  <span className="text-gray-600 text-sm">Loading Google Sign-Up...</span>
                </div>
              </div>
            ) : null}
            <div id="google-signup-button" className="w-full max-w-xs"></div>
          </div>

        </form>
      </div>
    </>
  )
}

export default SignUp