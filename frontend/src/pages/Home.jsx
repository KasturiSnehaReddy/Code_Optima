import React, { useEffect, useState, version } from 'react';
import Navbar from "../components/Navbar";
import TypewriterText from "../components/TypewriterText";
import Select from 'react-select';
import { api_base_url } from '../helper';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const Home = () => {
  const [isCreateModelShow, setIsCreateModelShow] = useState(false);
  const [languageOptions, setLanguageOptions] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState(null); // State to store selected language

  const [isEditModelShow, setIsEditModelShow] = useState(false);

  const navigate = useNavigate();

  const [name, setName] = useState("");

  const customStyles = {
    control: (provided) => ({
      ...provided,
      backgroundColor: '#000',
      borderColor: '#555',
      color: '#fff',
      padding: '5px',
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: '#000',
      color: '#fff',
      width: "100%"
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isFocused ? '#333' : '#000',
      color: '#fff',
      cursor: 'pointer',
    }),
    singleValue: (provided) => ({
      ...provided,
      color: '#fff',
    }),
    placeholder: (provided) => ({
      ...provided,
      color: '#aaa',
    }),
  };

  const getRunTimes = async () => {
    let res = await fetch("https://emkc.org/api/v2/piston/runtimes");
    let data = await res.json();

    // Filter only the required languages with latest versions
    const filteredLanguages = [
      "python",
      "javascript", 
      "c",
      "c++",
      "java"
    ];

    // Group by language and get the latest version for each
    const languageMap = new Map();
    
    data
      .filter(runtime => filteredLanguages.includes(runtime.language))
      .forEach(runtime => {
        const lang = runtime.language;
        if (!languageMap.has(lang) || runtime.version > languageMap.get(lang).version) {
          languageMap.set(lang, runtime);
        }
      });

    // Convert to options array with latest versions only
    const options = Array.from(languageMap.values()).map(runtime => ({
      label: `${runtime.language.charAt(0).toUpperCase() + runtime.language.slice(1)} (${runtime.version})`,
      value: runtime.language === "c++" ? "cpp" : runtime.language,
      version: runtime.version,
    }));

    // Sort alphabetically
    options.sort((a, b) => a.label.localeCompare(b.label));
    
    setLanguageOptions(options);
  };

  const handleLanguageChange = (selectedOption) => {
    setSelectedLanguage(selectedOption); // Update selected language state
    console.log("Selected language:", selectedOption);
  };

  const [projects, setProjects] = useState(null);
  const [userInfo, setUserInfo] = useState(null);

  const getUserInfo = async () => {
    try {
      const token = localStorage.getItem("token");
      console.log("Getting user info with token:", token ? "Token present" : "No token");
      
      const response = await fetch(api_base_url + "/getUserInfo", {
        mode: "cors",
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          token: token
        })
      });
      
      console.log("Response status:", response.status);
      const data = await response.json();
      console.log("Response data:", data);
      
      if (data.success) {
        setUserInfo(data.user);
      } else {
        console.error("Error:", data.msg);
        toast.error(data.msg);
      }
    } catch (error) {
      console.error("Error fetching user info:", error);
      toast.error("Failed to fetch user information");
    }
  };

  const getProjects = async () => {
    fetch(api_base_url + "/getProjects", {
      mode: "cors",
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        token: localStorage.getItem("token")
      })
    }).then(res => res.json()).then(data => {
      console.log(data)
      if (data.success) {
        setProjects(data.projects);
      }
      else {
        toast.error(data.msg);
      }
    });
  };

  useEffect(() => {
    getUserInfo();
    getProjects();
    getRunTimes();
  }, []);

  const createProj = () => {
    fetch(api_base_url + "/createProj", {
      mode: "cors",
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: name,
        projLanguage: selectedLanguage.value,
        token: localStorage.getItem("token"),
        version: selectedLanguage.version
      })
    }).then(res => res.json()).then(data => {
      if (data.success) {
        setName("");
        navigate("/editor/" + data.projectId)
      }
      else {
        toast.error(data.msg);
      }
    })
  };

  const [editProjId, setEditProjId] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    show: false,
    projectId: null,
    projectName: ""
  });

  const deleteProject = (id, projectName) => {
    setDeleteConfirmation({
      show: true,
      projectId: id,
      projectName: projectName
    });
  };

  const handleDeleteConfirm = () => {
    const { projectId } = deleteConfirmation;
    fetch(api_base_url + "/deleteProject", {
      mode: "cors",
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        projectId: projectId,
        token: localStorage.getItem("token")
      })
    }).then(res => res.json()).then(data => {
      if (data.success) {
        getProjects();
        toast.success("Project deleted successfully!");
      }
      else {
        toast.error(data.msg);
      }
    });
    setDeleteConfirmation({ show: false, projectId: null, projectName: "" });
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmation({ show: false, projectId: null, projectName: "" });
  };

  const updateProj = () => {
    fetch(api_base_url + "/editProject", {
      mode: "cors",
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        projectId: editProjId,
        token: localStorage.getItem("token"),
        name: name,
      })
    }).then(res => res.json()).then(data => {
      if (data.success) {
        setIsEditModelShow(false);
        setName("");
        setEditProjId("");
        getProjects();
      }
      else {
        toast.error(data.msg);
        setIsEditModelShow(false);
        setName("");
        setEditProjId("");
        getProjects();
      }
    })
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-white to-gray-50 py-8">
        <div className="flex items-center px-[100px] mt-5">
          <div className="text-3xl font-bold">
            {userInfo ? (
              <TypewriterText 
                text={`Welcome ${userInfo.fullName}`} 
                speed={80} 
                delay={300}
              />
            ) : (
              <div className="animate-pulse text-gray-400">Loading...</div>
            )}
          </div>
        </div>

        <div className="projects px-[100px] mt-8 pb-10">
          {projects && projects.length > 0 && (
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-700">Your Projects</h2>
              <button 
                onClick={() => { setIsCreateModelShow(true) }} 
                className="btnNormal !w-fit bg-custom-teal text-white transition-all hover:bg-custom-teal-dark flex items-center gap-2 px-6"
              >
                <span className="text-lg">+</span>
                Create New Project
              </button>
            </div>
          )}
          {
            projects && projects.length > 0 ? projects.map((project, index) => {
              return (
                <div key={index} className="project w-full p-[20px] flex items-center justify-between bg-white">
                  <div onClick={() => { navigate("/editor/" + project._id) }} className='flex w-full items-center gap-[20px]'>
                    {
                      project.projLanguage === "python" ?
                        <img className='w-[80px] h-[60px] object-contain rounded-lg' src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg" alt="Python" />
                        : project.projLanguage === "javascript" ?
                          <img className='w-[80px] h-[60px] object-contain rounded-lg' src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg" alt="JavaScript" />
                          : project.projLanguage === "cpp" ?
                            <img className='w-[80px] h-[60px] object-contain rounded-lg' src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cplusplus/cplusplus-original.svg" alt="C++" />
                            : project.projLanguage === "c" ?
                              <img className='w-[80px] h-[60px] object-contain rounded-lg' src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/c/c-original.svg" alt="C" />
                              : project.projLanguage === "java" ?
                                <img className='w-[80px] h-[60px] object-contain rounded-lg' src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg" alt="Java" />
                                : <div className="w-[80px] h-[60px] bg-gray-200 rounded-lg flex items-center justify-center">
                                    <span className="text-gray-500 text-xs font-semibold">CODE</span>
                                  </div>
                    }
                    <div className="flex-1">
                      <h3 className='text-xl font-semibold text-gray-800'>{project.name}</h3>
                      <p className='text-sm text-gray-500 mt-1'>
                        {project.projLanguage.toUpperCase()} • {new Date(project.date).toDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button 
                      className="btnNormal !w-fit !px-4 !py-2 bg-custom-teal text-white transition-all hover:bg-custom-teal-dark" 
                      onClick={() => {
                        setIsEditModelShow(true);
                        setEditProjId(project._id);
                        setName(project.name);
                      }}
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => { deleteProject(project._id, project.name) }} 
                      className="btnNormal !w-fit !px-4 !py-2 bg-red-100 text-red-600 transition-all hover:bg-red-200 border border-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )
            }) : (
              <div className="text-center py-16">
                <div className="text-gray-400 text-6xl mb-4">📂</div>
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No Projects Yet</h3>
                <p className="text-gray-500 mb-6">Create your first project to get started</p>
                <button 
                  onClick={() => { setIsCreateModelShow(true) }} 
                  className="btnNormal !w-fit bg-custom-teal text-white transition-all hover:bg-custom-teal-dark"
                >
                  Create Your First Project
                </button>
              </div>
            )
        }
      </div>
      </div>

      {
        isCreateModelShow &&
        <div onClick={(e) => {
          if (e.target.classList.contains("modelCon")) {
            setIsCreateModelShow(false);
            setName("");
          }
        }} className='modelCon modalOverlay flex flex-col items-center justify-center w-screen h-screen fixed top-0 left-0'>
          <div className="modelBox flex flex-col items-start rounded-2xl p-8 w-[28vw] h-[auto] bg-white shadow-2xl">
            <h3 className='text-2xl font-bold text-gray-800 mb-6'>Create New Project</h3>
            <div className="inputBox w-full">
              <input 
                onChange={(e) => { setName(e.target.value) }} 
                value={name} 
                type="text" 
                placeholder='Enter your project name' 
                className="text-gray-800" 
              />
            </div>
            <Select
              placeholder="Select a Language"
              options={languageOptions}
              styles={{
                control: (provided) => ({
                  ...provided,
                  backgroundColor: '#f8f9fa',
                  borderColor: '#e9ecef',
                  color: '#333333',
                  padding: '8px',
                  borderRadius: '12px',
                  border: '2px solid #e9ecef',
                  boxShadow: 'none',
                  '&:hover': {
                    borderColor: '#008080'
                  }
                }),
                menu: (provided) => ({
                  ...provided,
                  backgroundColor: '#ffffff',
                  color: '#333333',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                  border: '1px solid #e9ecef'
                }),
                option: (provided, state) => ({
                  ...provided,
                  backgroundColor: state.isFocused ? '#f0f9ff' : '#ffffff',
                  color: '#333333',
                  cursor: 'pointer',
                  padding: '12px 16px'
                }),
                singleValue: (provided) => ({
                  ...provided,
                  color: '#333333',
                }),
                placeholder: (provided) => ({
                  ...provided,
                  color: '#6c757d',
                }),
              }}
              onChange={handleLanguageChange}
            />
            {selectedLanguage && (
              <div className="w-full mt-4">
                <p className="text-sm text-green-600 mb-4 bg-green-50 p-3 rounded-lg border border-green-200">
                  ✅ Selected Language: <strong>{selectedLanguage.label}</strong>
                </p>
                <button onClick={createProj} className="btnNormal bg-custom-teal text-white transition-all hover:bg-custom-teal-dark">
                  Create Project
                </button>
              </div>
            )}
          </div>
        </div>
      }

      {
        isEditModelShow &&
        <div onClick={(e) => {
          if (e.target.classList.contains("modelCon")) {
            setIsEditModelShow(false);
            setName("");
          }
        }} className='modelCon modalOverlay flex flex-col items-center justify-center w-screen h-screen fixed top-0 left-0'>
          <div className="modelBox flex flex-col items-start rounded-2xl p-8 w-[28vw] h-[auto] bg-white shadow-2xl">
            <h3 className='text-2xl font-bold text-gray-800 mb-6'>Update Project</h3>
            <div className="inputBox w-full">
              <input 
                onChange={(e) => { setName(e.target.value) }} 
                value={name} 
                type="text" 
                placeholder='Enter your project name' 
                className="text-gray-800" 
              />
            </div>
            <button onClick={updateProj} className="btnNormal bg-custom-teal text-white transition-all hover:bg-custom-teal-dark mt-4">
              Update Project
            </button>
          </div>
        </div>
      }

      {/* Delete Confirmation Modal */}
      {
        deleteConfirmation.show && <div onClick={(e) => {
          if (e.target === e.currentTarget) {
            handleDeleteCancel();
          }
        }} className='modelCon modalOverlay flex flex-col items-center justify-center w-screen h-screen fixed top-0 left-0'>
          <div className="modelBox flex flex-col items-center rounded-2xl p-8 w-[32vw] h-[auto] bg-white shadow-2xl">
            <div className="text-red-500 text-6xl mb-4">🗑️</div>
            <h3 className='text-2xl font-bold text-gray-800 mb-2'>Delete Project</h3>
            <p className='text-gray-600 text-center mb-6'>
              Are you sure you want to delete <strong>"{deleteConfirmation.projectName}"</strong>? 
              <br />
              This action cannot be undone.
            </p>
            <div className="flex gap-4 w-full">
              <button 
                onClick={handleDeleteCancel} 
                className="btnNormal flex-1 bg-gray-100 text-gray-700 transition-all hover:bg-gray-200 border border-gray-300"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteConfirm} 
                className="btnNormal flex-1 bg-red-500 text-white transition-all hover:bg-red-600"
              >
                Delete Project
              </button>
            </div>
          </div>
        </div>
      }
    </>
  );
};

export default Home;
