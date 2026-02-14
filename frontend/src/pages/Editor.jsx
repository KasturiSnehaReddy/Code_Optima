import React, { useEffect, useState, useRef } from 'react';
import Navbar from '../components/Navbar';
import Editor2 from '@monaco-editor/react';
import { useParams, useNavigate } from 'react-router-dom';
import { api_base_url, handleAuthError } from '../helper';
import { toast } from 'react-toastify';

const Editor = () => {
  const [code, setCode] = useState(""); // State to hold the code
  const { id } = useParams(); // Extract project ID from URL params
  const navigate = useNavigate();
  const [output, setOutput] = useState("");
  const [error, setError] = useState(false);
  const [data, setData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const autosaveTimerRef = useRef(null);
  const initialLoadRef = useRef(true);
  
  // Time complexity analysis states
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [timeComplexityAnalysis, setTimeComplexityAnalysis] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasExistingAnalysis, setHasExistingAnalysis] = useState(false);

  // Optimized solution states
  const [showOptimizedModal, setShowOptimizedModal] = useState(false);
  const [optimizedSolution, setOptimizedSolution] = useState("");
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [hasOptimizedSolution, setHasOptimizedSolution] = useState(false);

  // Helper function to get Monaco editor language
  const getMonacoLanguage = (projLanguage) => {
    switch (projLanguage) {
      case 'python': return 'python';
      case 'javascript': return 'javascript';
      case 'java': return 'java';
      case 'c': return 'c';
      case 'cpp': return 'cpp';
      default: return 'plaintext';
    }
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

  // Fetch project data on mount
  useEffect(() => {
    if (!isAuthChecking) {
      fetch(`${api_base_url}/getProject`, {
        mode: 'cors',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: localStorage.getItem('token'),
          projectId: id,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            // Ensure proper line breaks are preserved
            const codeWithLineBreaks = data.project.code || '';
            console.log('Fetched code:', codeWithLineBreaks); // Debug log
            setCode(codeWithLineBreaks); // Set the fetched code
            setData(data.project);
            // mark initial load complete so autosave doesn't trigger immediately
            initialLoadRef.current = false;
          } else {
            toast.error(data.msg);
          }
        })
        .catch((err) => {
          console.error('Error fetching project:', err);
          toast.error('Failed to load project.');
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isAuthChecking]);

  // Save project function
  // internal save implementation; showToast controls whether to show toast (autosave uses false)
  const performSave = async (showToast = true) => {
    const trimmedCode = code?.toString(); // do not trim autosave so indentation preserved
    // mark saving state
    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`${api_base_url}/saveProject`, {
        mode: 'cors',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: localStorage.getItem('token'), projectId: id, code: trimmedCode })
      });
      const resJson = await res.json();
      if (resJson.success) {
        setLastSavedAt(new Date());
        if (showToast) toast.success(resJson.msg);
      } else {
        setSaveError(resJson.msg || 'Save failed');
        if (showToast) toast.error(resJson.msg || 'Failed to save the project.');
      }
    } catch (err) {
      console.error('Error saving project:', err);
      setSaveError(err.message || 'Network error');
      if (showToast) toast.error('Failed to save the project.');
    } finally {
      setIsSaving(false);
    }
  };

  // public saveProject keeps compatibility with keyboard shortcut and manual saves
  const saveProject = () => performSave(true);

  // Shortcut handler for saving with Ctrl+S
  const handleSaveShortcut = (e) => {
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault(); // Prevent browser's default save behavior
      saveProject(); // Call the save function
    }
  };

  // Add and clean up keyboard event listener
  useEffect(() => {
    window.addEventListener('keydown', handleSaveShortcut);
    return () => {
      window.removeEventListener('keydown', handleSaveShortcut);
    };
  }, [code]); // Reattach when `code` changes

  // Autosave: debounce saves when `code` changes
  useEffect(() => {
    // Don't autosave while initial load is happening
    if (initialLoadRef.current) return;

    // Clear existing timer
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);

    // Schedule autosave
    autosaveTimerRef.current = setTimeout(() => {
      performSave(false); // silent autosave
    }, 1500);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [code]);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, []);

  const runProject = () => {
    fetch("https://emkc.org/api/v2/piston/execute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        language: data.projLanguage,
        version: data.version,
        files: [
          {
            filename: data.name + data.projLanguage === "python" ? ".py" : data.projLanguage === "java" ? ".java" : data.projLanguage === "javascript" ? ".js" : data.projLanguage === "c" ? ".c" : data.projLanguage === "cpp" ? ".cpp" : data.projLanguage === "bash" ? ".sh" : "",
            content: code
          }
        ]
      })
    }).then(res => res.json()).then(data => {
      console.log(data)
      setOutput(data.run.output);
      setError(data.run.code === 1 ? true : false);
    })
  }

  // Time Complexity Analysis Functions
  const analyzeTimeComplexity = async () => {
    if (!code.trim()) {
      toast.error("Please write some code before analyzing!");
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await fetch(`${api_base_url}/analyzeTimeComplexity`, {
        mode: 'cors',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: localStorage.getItem('token'),
          projectId: id,
          code: code,
          language: data?.projLanguage || 'javascript'
        }),
      });

      const result = await response.json();
      if (result.success) {
        setTimeComplexityAnalysis(result.analysis);
        setHasExistingAnalysis(true);
        setShowAnalysisModal(true);
        toast.success("Time complexity analysis completed!");
      } else {
        toast.error(result.msg);
      }
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Failed to analyze time complexity. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const loadExistingAnalysis = async () => {
    try {
      const response = await fetch(`${api_base_url}/getTimeComplexityAnalysis`, {
        mode: 'cors',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: localStorage.getItem('token'),
          projectId: id
        }),
      });

      const result = await response.json();
      if (result.success) {
        setTimeComplexityAnalysis(result.analysis || '');
        setHasExistingAnalysis(result.hasAnalysis);
      }
    } catch (error) {
      console.error('Load analysis error:', error);
    }
  };

  // Load existing analysis when component mounts
  useEffect(() => {
    if (id) {
      loadExistingAnalysis();
      loadOptimizedSolution();
    }
  }, [id]);

  // Optimized Solution Functions
  const generateOptimizedSolution = async () => {
    if (!code.trim()) {
      toast.error("Please write some code before optimizing!");
      return;
    }

    setIsOptimizing(true);
    try {
      const response = await fetch(`${api_base_url}/generateOptimizedSolution`, {
        mode: 'cors',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: localStorage.getItem('token'),
          projectId: id,
          code: code,
          language: data?.projLanguage || 'javascript'
        }),
      });

      const result = await response.json();
      if (result.success) {
        setOptimizedSolution(result.optimizedSolution);
        setHasOptimizedSolution(true);
        setShowOptimizedModal(true);
        toast.success("Optimized solution generated!");
      } else {
        toast.error(result.msg);
      }
    } catch (error) {
      console.error('Optimization error:', error);
      toast.error('Failed to generate optimized solution. Please try again.');
    } finally {
      setIsOptimizing(false);
    }
  };

  const loadOptimizedSolution = async () => {
    try {
      const response = await fetch(`${api_base_url}/getOptimizedSolution`, {
        mode: 'cors',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: localStorage.getItem('token'),
          projectId: id
        }),
      });

      const result = await response.json();
      if (result.success) {
        setOptimizedSolution(result.optimizedSolution || '');
        setHasOptimizedSolution(result.hasOptimizedSolution);
      }
    } catch (error) {
      console.error('Load optimized solution error:', error);
    }
  };

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="flex items-center justify-between bg-gray-900 border-t-2 border-gray-600" style={{ height: 'calc(100vh - 90px)' }}>
        <div className="left w-[50%] h-full border-r border-gray-700">
          <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700">
            <div className="text-sm text-gray-300">Editor</div>
            <div className="text-xs text-gray-400 flex items-center gap-3">
              {isSaving ? (
                <div className="flex items-center gap-2"><span className="animate-pulse">●</span><span>Saving...</span></div>
              ) : saveError ? (
                <div className="text-red-400">Save failed</div>
              ) : lastSavedAt ? (
                <div>Saved at {new Date(lastSavedAt).toLocaleTimeString()}</div>
              ) : (
                <div className="text-gray-500">Not saved yet</div>
              )}
            </div>
          </div>
          <Editor2
            onChange={(newCode) => {
              console.log('New Code:', newCode); // Debug: Log changes
              setCode(newCode || ''); // Update state
            }}
            theme="vs-dark"
            height="100%"
            width="100%"
            language={data?.projLanguage ? getMonacoLanguage(data.projLanguage) : "python"}
            value={code} // Bind editor to state
            options={{
              fontSize: 14,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              lineNumbers: 'on',
              roundedSelection: false,
              scrollbar: {
                vertical: 'auto',
                horizontal: 'auto'
              },
              theme: 'vs-dark'
            }}
          />
        </div>
        <div className="right p-[20px] w-[50%] h-full bg-gray-800">
          <div className="flex pb-4 border-b-2 border-gray-600 items-center justify-between">
            <h3 className="text-white text-lg font-semibold m-0">Output & Analysis</h3>
            <div className="flex gap-3">
              <button
                className="btnNormal !w-fit !px-[20px] !py-[8px] bg-purple-600 text-white transition-all hover:bg-purple-700 shadow-lg"
                onClick={() => hasExistingAnalysis ? setShowAnalysisModal(true) : analyzeTimeComplexity()}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? '🔄 Analyzing...' : hasExistingAnalysis ? '📊 View Analysis' : '🔍 Analyze Complexity'}
              </button>
              <button
                className="btnNormal !w-fit !px-[20px] !py-[8px] bg-orange-600 text-white transition-all hover:bg-orange-700 shadow-lg"
                onClick={() => hasOptimizedSolution ? setShowOptimizedModal(true) : generateOptimizedSolution()}
                disabled={isOptimizing}
              >
                {isOptimizing ? '⚡ Optimizing...' : hasOptimizedSolution ? '🚀 View Optimized' : '⚡ Optimize Code'}
              </button>
              <button
                className="btnNormal !w-fit !px-[24px] !py-[8px] bg-custom-teal text-white transition-all hover:bg-custom-teal-dark shadow-lg"
                onClick={runProject}
              >
                ▶ Run Code
              </button>
            </div>
          </div>
          <div className="output-container mt-4 h-[calc(100vh-200px)] overflow-auto">
            <pre 
              className={`w-full min-h-full p-4 rounded-lg font-mono text-sm leading-relaxed ${
                error 
                  ? "text-red-300 bg-red-900/20 border border-red-700/30" 
                  : "text-green-300 bg-gray-900/50 border border-gray-600"
              }`} 
              style={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-word"
              }}
            >
              {output || (
                <span className="text-gray-500 italic">
                  Click "Run Code" to see output here...
                </span>
              )}
            </pre>
          </div>
        </div>
      </div>

      {/* Time Complexity Analysis Modal */}
      {showAnalysisModal && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAnalysisModal(false);
            }
          }} 
          className='modalOverlay flex flex-col items-center justify-center w-screen h-screen fixed top-0 left-0 bg-black bg-opacity-50 z-50'
        >
          <div className="modal-content bg-white rounded-2xl p-8 w-[80vw] max-w-4xl h-[80vh] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className='text-3xl font-bold text-gray-800 flex items-center gap-3'>
                <span className="text-4xl">🔍</span>
                Time Complexity Analysis
              </h2>
              <div className="flex gap-3">
                {hasExistingAnalysis && (
                  <button 
                    onClick={analyzeTimeComplexity}
                    disabled={isAnalyzing}
                    className="btnNormal !w-fit !px-4 !py-2 bg-purple-600 text-white transition-all hover:bg-purple-700"
                  >
                    {isAnalyzing ? '🔄 Re-analyzing...' : '🔄 Re-analyze'}
                  </button>
                )}
                <button 
                  onClick={() => setShowAnalysisModal(false)}
                  className="btnNormal !w-fit !px-4 !py-2 bg-gray-500 text-white transition-all hover:bg-gray-600"
                >
                  ✕ Close
                </button>
              </div>
            </div>
            
            <div className="analysis-content h-[calc(100%-100px)] overflow-auto">
              {isAnalyzing ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-600">
                  <div className="text-6xl mb-4 animate-spin">⚙️</div>
                  <h3 className="text-2xl font-semibold mb-2">Analyzing Your Code...</h3>
                  <p className="text-lg">Our AI is examining the time complexity of your algorithm</p>
                  <div className="mt-4 w-64 bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-600 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
                  </div>
                </div>
              ) : timeComplexityAnalysis ? (
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="prose max-w-none">
                    <div 
                      className="whitespace-pre-wrap text-gray-800 leading-relaxed font-sans text-base"
                      dangerouslySetInnerHTML={{
                        __html: timeComplexityAnalysis
                          .replace(/## (⏰|💾|📊) (.*?):/g, '<h3 class="text-xl font-bold text-gray-900 mt-6 mb-3 flex items-center gap-2"><span>$1</span>$2:</h3>')
                          .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
                          .replace(/- (.*)/g, '<div class="ml-4 mb-2 text-gray-700">• $1</div>')
                          .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-gray-800 text-green-400 p-4 rounded-lg mt-2 mb-2 overflow-x-auto"><code>$2</code></pre>')
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <div className="text-6xl mb-4">📊</div>
                  <h3 className="text-2xl font-semibold mb-2">No Analysis Yet</h3>
                  <p className="text-lg mb-4">Click "Analyze Complexity" to get started</p>
                  <button 
                    onClick={analyzeTimeComplexity}
                    disabled={isAnalyzing}
                    className="btnNormal bg-purple-600 text-white transition-all hover:bg-purple-700"
                  >
                    🔍 Analyze Time Complexity
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Optimized Solution Modal */}
      {showOptimizedModal && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowOptimizedModal(false);
            }
          }} 
          className='modalOverlay flex flex-col items-center justify-center w-screen h-screen fixed top-0 left-0 bg-black bg-opacity-50 z-50'
        >
          <div className="modal-content bg-white rounded-2xl p-8 w-[80vw] max-w-4xl h-[80vh] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className='text-3xl font-bold text-gray-800 flex items-center gap-3'>
                <span className="text-4xl">⚡</span>
                Optimized Solution
              </h2>
              <div className="flex gap-3">
                {hasOptimizedSolution && (
                  <button 
                    onClick={generateOptimizedSolution}
                    disabled={isOptimizing}
                    className="btnNormal !w-fit !px-4 !py-2 bg-orange-600 text-white transition-all hover:bg-orange-700"
                  >
                    {isOptimizing ? '⚡ Re-optimizing...' : '🔄 Re-optimize'}
                  </button>
                )}
                <button 
                  onClick={() => setShowOptimizedModal(false)}
                  className="btnNormal !w-fit !px-4 !py-2 bg-gray-500 text-white transition-all hover:bg-gray-600"
                >
                  ✕ Close
                </button>
              </div>
            </div>
            
            <div className="optimized-content h-[calc(100%-100px)] overflow-auto">
              {isOptimizing ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-600">
                  <div className="text-6xl mb-4 animate-pulse">⚡</div>
                  <h3 className="text-2xl font-semibold mb-2">Optimizing Your Code...</h3>
                  <p className="text-lg">AI is generating a more efficient solution</p>
                  <div className="mt-4 w-64 bg-gray-200 rounded-full h-2">
                    <div className="bg-orange-600 h-2 rounded-full animate-pulse" style={{width: '70%'}}></div>
                  </div>
                </div>
              ) : optimizedSolution ? (
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="prose max-w-none">
                    <div 
                      className="whitespace-pre-wrap text-gray-800 leading-relaxed font-sans text-base"
                      dangerouslySetInnerHTML={{
                        __html: optimizedSolution
                          .replace(/## (🚀|💡|⚡) (.*?):/g, '<h3 class="text-xl font-bold text-gray-900 mt-6 mb-3 flex items-center gap-2"><span>$1</span>$2:</h3>')
                          .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
                          .replace(/- (.*)/g, '<div class="ml-4 mb-2 text-gray-700">• $1</div>')
                          .replace(/```(\w+)?\n([\s\S]*?)```/g, '<div class="relative"><pre class="bg-gray-900 text-green-400 p-4 rounded-lg mt-2 mb-2 overflow-x-auto"><code>$2</code></pre><button onclick="navigator.clipboard.writeText(`$2`)" class="absolute top-4 right-4 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-all">📋 Copy</button></div>')
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <div className="text-6xl mb-4">⚡</div>
                  <h3 className="text-2xl font-semibold mb-2">No Optimized Solution Yet</h3>
                  <p className="text-lg mb-4">Click "Optimize Code" to get an improved version</p>
                  <button 
                    onClick={generateOptimizedSolution}
                    disabled={isOptimizing}
                    className="btnNormal bg-orange-600 text-white transition-all hover:bg-orange-700"
                  >
                    ⚡ Generate Optimized Solution
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Editor;
