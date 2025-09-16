import React from 'react'
import logo from "../images/logos/logo2.png"
import { Link } from 'react-router-dom'

const Navbar = () => {
  return (
    <>
      <div className="nav flex px-[100px] items-center justify-between h-[90px] bg-gray-800 border-b-2 border-gray-600 shadow-lg">
        <div className="flex items-center gap-3">
          <img src={logo} className='w-[48px] h-[48px] object-contain' alt="Code Optima Logo" />
          <span className="text-2xl font-bold text-white tracking-tight select-none">Code <span className="text-custom-teal">Optima</span></span>
        </div>

        <div className="links flex items-center gap-[20px]">
          <Link className='text-gray-300 font-medium transition-all hover:text-white hover:font-semibold'>Home</Link>
          <Link className='text-gray-300 font-medium transition-all hover:text-white hover:font-semibold'>About</Link>
          <Link className='text-gray-300 font-medium transition-all hover:text-white hover:font-semibold'>Contact</Link>
          <button onClick={()=>{
            localStorage.removeItem("token");
            localStorage.removeItem("isLoggedIn");
            window.location.reload();
          }} className="btnNormal !w-fit bg-gray-600 text-white border border-gray-500 transition-all hover:bg-gray-700 hover:border-gray-400 px-[20px]">Logout</button>
        </div>
      </div>
    </>
  )
}

export default Navbar