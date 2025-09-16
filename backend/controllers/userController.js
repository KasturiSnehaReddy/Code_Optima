const userModel = require("../models/userModel");
const projectModel = require("../models/projectModel");
var bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { OAuth2Client } = require('google-auth-library');

const secret = process.env.JWT_SECRET || "secret-123";
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'your-api-key-here');

function getStartupCode(language) {
  if (language.toLowerCase() === "python") {
    return 'print("Hello World")';
  } else if (language.toLowerCase() === "java") {
    return `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello World");
    }
}`;
  } else if (language.toLowerCase() === "javascript") {
    return 'console.log("Hello World");';
  } else if (language.toLowerCase() === "cpp") {
    return `#include <iostream>
using namespace std;

int main() {
    cout << "Hello World" << endl;
    return 0;
}`;
  } else if (language.toLowerCase() === "c") {
    return `#include <stdio.h>

int main() {
    printf("Hello World\\n");
    return 0;
}`;
  } else {
    return '// Language not supported\nconsole.log("Hello World");';
  }
}
exports.signUp = async (req, res) => {
  try {

    let { email, pwd, fullName } = req.body;

    let emailCon = await userModel.findOne({ email: email });
    if (emailCon) {
      return res.status(400).json({
        success: false,
        msg: "Email already exist"
      })
    }

    bcrypt.genSalt(12, function (err, salt) {
      bcrypt.hash(pwd, salt, async function (err, hash) {

        let user = await userModel.create({
          email: email,
          password: hash,
          fullName: fullName
        });

        return res.status(200).json({
          success: true,
          msg: "User created successfully",
        });

      });
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      msg: error.message
    });
  }
};

exports.login = async (req, res) => {
  try {

    let { email, pwd } = req.body;

    let user = await userModel.findOne({ email: email });
    if (!user) {
      return res.status(404).json({
        success: false,
        msg: "User not found"
      });
    }

    bcrypt.compare(pwd, user.password, function (err, result) {
      if (result) {

        let token = jwt.sign({ userId: user._id }, secret)

        return res.status(200).json({
          success: true,
          msg: "User logged in successfully",
          token
        });
      }
      else {
        return res.status(401).json({
          success: false,
          msg: "Invalid password"
        });
      }
    })

  } catch (error) {
    return res.status(500).json({
      success: false,
      msg: error.message
    })
  }
};

exports.createProj = async (req, res) => {
  try {

    let { name, projLanguage, token, version } = req.body;
    let decoded = jwt.verify(token, secret);
    let user = await userModel.findOne({ _id: decoded.userId });

    if (!user) {
      return res.status(404).json({
        success: false,
        msg: "User not found"
      });
    };

    let project = await projectModel.create({
      name: name,
      projLanguage: projLanguage,
      createdBy: user._id,
      code: getStartupCode(projLanguage),
      version: version
    });


    return res.status(200).json({
      success: true,
      msg: "Project created successfully",
      projectId: project._id
    });


  } catch (error) {
    return res.status(500).json({
      success: false,
      msg: error.message
    })
  }
};

exports.saveProject = async (req, res) => {
  try {

    let { token, projectId, code } = req.body;
    console.log("DATA: ",token, projectId, code)
    let decoded = jwt.verify(token, secret);
    let user = await userModel.findOne({ _id: decoded.userId });

    if (!user) {
      return res.status(404).json({
        success: false,
        msg: "User not found"
      });
    };

    let project = await projectModel.findOneAndUpdate({ _id: projectId }, {code: code});

    return res.status(200).json({
      success: true,
      msg: "Project saved successfully"
    });

  } catch (error) {
    console.log(error)
    return res.status(500).json({
      success: false,
      msg: error.message
    })
  }
};

exports.getProjects = async (req, res) => {
  try {

    let { token } = req.body;
    let decoded = jwt.verify(token, secret);
    let user = await userModel.findOne({ _id: decoded.userId });

    if (!user) {
      return res.status(404).json({
        success: false,
        msg: "User not found"
      });
    }

    let projects = await projectModel.find({ createdBy: user._id });

    return res.status(200).json({
      success: true,
      msg: "Projects fetched successfully",
      projects: projects
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      msg: error.message
    })
  }
};

exports.getProject = async (req, res) => {
  try {

    let { token, projectId } = req.body;
    let decoded = jwt.verify(token, secret);
    let user = await userModel.findOne({ _id: decoded.userId });

    if (!user) {
      return res.status(404).json({
        success: false,
        msg: "User not found"
      });
    }

    let project = await projectModel.findOne({ _id: projectId });

    if (project) {
      return res.status(200).json({
        success: true,
        msg: "Project fetched successfully",
        project: project
      });
    }
    else {
      return res.status(404).json({
        success: false,
        msg: "Project not found"
      });
    }

  } catch (error) {
    return res.status(500).json({
      success: false,
      msg: error.message
    })
  }
};

exports.deleteProject = async (req, res) => {
  try {

    let { token, projectId } = req.body;
    let decoded = jwt.verify(token, secret);
    let user = await userModel.findOne({ _id: decoded.userId });

    if (!user) {
      return res.status(404).json({
        success: false,
        msg: "User not found"
      });
    }

    let project = await projectModel.findOneAndDelete({ _id: projectId });

    return res.status(200).json({
      success: true,
      msg: "Project deleted successfully"
    })

  } catch (error) {
    return res.status(500).json({
      success: false,
      msg: error.message
    })
  }
};

exports.editProject = async (req, res) => {
  try {

    let {token, projectId, name} = req.body;
    let decoded = jwt.verify(token, secret);
    let user = await userModel.findOne({ _id: decoded.userId });

    if (!user) {
      return res.status(404).json({
        success: false,
        msg: "User not found"
      });
    };

    let project = await projectModel.findOne({ _id: projectId });
    if(project){
      project.name = name;
      await project.save();
      return res.status(200).json({
        success: true,
        msg: "Project edited successfully"
      })
    }
    else{
      return res.status(404).json({
        success: false,
        msg: "Project not found"
      })
    }

  } catch (error) {
    return res.status(500).json({
      success: false,
      msg: error.message
    })
  }
};

exports.getUserInfo = async (req, res) => {
  try {
    let { token } = req.body;
    
    console.log("getUserInfo called with token:", token ? "Token present" : "No token");
    
    if (!token) {
      return res.status(401).json({
        success: false,
        msg: "Token required"
      });
    }

    let decoded = jwt.verify(token, secret);
    console.log("Decoded token:", decoded);
    
    let user = await userModel.findById(decoded.userId).select('-password');
    console.log("User found:", user ? user.fullName : "No user");
    
    if (!user) {
      return res.status(404).json({
        success: false,
        msg: "User not found"
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        fullName: user.fullName,
        email: user.email
      }
    });

  } catch (error) {
    console.error("getUserInfo error:", error.message);
    return res.status(500).json({
      success: false,
      msg: error.message
    });
  }
};

// Time Complexity Analysis function
exports.analyzeTimeComplexity = async (req, res) => {
  try {
    const { projectId, code, language } = req.body;
    const token = req.body.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        msg: "Unauthorized access"
      });
    }

    const decoded = jwt.verify(token, secret);
    
    // Verify the project belongs to the user
    const project = await projectModel.findOne({ 
      _id: projectId, 
      createdBy: decoded.userId 
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        msg: "Project not found"
      });
    }

    // Create a detailed prompt for time complexity analysis
    const prompt = `Analyze the following ${language} code and provide a clean, concise analysis:

**Code to analyze:**
\`\`\`${language}
${code}
\`\`\`

**Please provide your analysis in this exact format:**

## ⏰ Time Complexity: [Big O notation]

## 💾 Space Complexity: [Big O notation]

## 📊 Analysis:
- Brief explanation of why this complexity
- Key operations that determine the complexity
- Any loops, recursions, or data structures involved

Keep it concise and educational. No extra details or lengthy explanations.`;

    // Get Gemini model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Create the full prompt with system context
    const fullPrompt = `You are a concise algorithm analysis expert. Provide clean, structured complexity analysis without excessive details. Focus on clarity and practical insights.

${prompt}`;

    // Call Gemini API
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const analysis = response.text();

    // Save the analysis to the project
    await projectModel.findByIdAndUpdate(projectId, {
      timeComplexityAnalysis: analysis
    });

    return res.status(200).json({
      success: true,
      analysis: analysis,
      msg: "Time complexity analysis completed successfully"
    });

  } catch (error) {
    console.error("Time complexity analysis error:", error.message);
    return res.status(500).json({
      success: false,
      msg: "Failed to analyze time complexity. Please check your Gemini API configuration.",
      error: error.message
    });
  }
};

// Get saved time complexity analysis
exports.getTimeComplexityAnalysis = async (req, res) => {
  try {
    const { projectId } = req.body;
    const token = req.body.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        msg: "Unauthorized access"
      });
    }

    const decoded = jwt.verify(token, secret);
    
    const project = await projectModel.findOne({ 
      _id: projectId, 
      createdBy: decoded.userId 
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        msg: "Project not found"
      });
    }

    return res.status(200).json({
      success: true,
      analysis: project.timeComplexityAnalysis,
      hasAnalysis: !!project.timeComplexityAnalysis
    });

  } catch (error) {
    console.error("Get time complexity analysis error:", error.message);
    return res.status(500).json({
      success: false,
      msg: error.message
    });
  }
};

// Generate Optimized Solution function
exports.generateOptimizedSolution = async (req, res) => {
  try {
    const { projectId, code, language } = req.body;
    const token = req.body.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        msg: "Unauthorized access"
      });
    }

    const decoded = jwt.verify(token, secret);
    
    // Verify the project belongs to the user
    const project = await projectModel.findOne({ 
      _id: projectId, 
      createdBy: decoded.userId 
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        msg: "Project not found"
      });
    }

    console.log('Starting optimized solution generation...');

    // Create a detailed prompt for optimized solution
    const prompt = `Analyze and optimize the following ${language} code:

**Original Code:**
\`\`\`${language}
${code}
\`\`\`

**Please provide your response in this exact format:**

## 🚀 Optimized Solution:

\`\`\`${language}
[Your optimized code here - make it copyable and properly formatted]
\`\`\`

## 💡 Why This is Better:
- Key improvement #1 (e.g., reduced time complexity)
- Key improvement #2 (e.g., better space usage)
- Key improvement #3 (e.g., cleaner logic)

## ⚡ Performance Gains:
- Original: O(?) time, O(?) space
- Optimized: O(?) time, O(?) space

Keep the explanation concise and focus on the practical improvements.`;

    // Get Gemini model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Create the full prompt with system context
    const fullPrompt = `You are an expert software optimization specialist. Provide clean, efficient code solutions with clear explanations of improvements. Focus on practical optimizations.

${prompt}`;

    // Call Gemini API
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const optimizedSolution = response.text();

    // Save the optimized solution to the project
    await projectModel.findByIdAndUpdate(projectId, {
      optimizedSolution: optimizedSolution
    });

    return res.status(200).json({
      success: true,
      optimizedSolution: optimizedSolution,
      msg: "Optimized solution generated successfully"
    });

  } catch (error) {
    console.error("Optimized solution generation error:", error.message);
    return res.status(500).json({
      success: false,
      msg: "Failed to generate optimized solution. Please check your Gemini API configuration.",
      error: error.message
    });
  }
};

// Get saved optimized solution
exports.getOptimizedSolution = async (req, res) => {
  try {
    const { projectId } = req.body;
    const token = req.body.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        msg: "Unauthorized access"
      });
    }

    const decoded = jwt.verify(token, secret);
    
    const project = await projectModel.findOne({ 
      _id: projectId, 
      createdBy: decoded.userId 
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        msg: "Project not found"
      });
    }

    return res.status(200).json({
      success: true,
      optimizedSolution: project.optimizedSolution,
      hasOptimizedSolution: !!project.optimizedSolution
    });

  } catch (error) {
    console.error("Get optimized solution error:", error.message);
    return res.status(500).json({
      success: false,
      msg: error.message
    });
  }
};

exports.googleLogin = async (req, res) => {
  try {
    const { token } = req.body;
    
    // Verify the Google token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID',
    });
    
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;
    
    // Check if user exists
    let user = await userModel.findOne({ 
      $or: [
        { email: email },
        { googleId: googleId }
      ]
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        msg: "User not found. Please sign up first."
      });
    }
    
    // Update user with Google ID if not present
    if (!user.googleId) {
      user.googleId = googleId;
      await user.save();
    }
    
    // Generate JWT token
    const jwtToken = jwt.sign(
      { 
        userId: user._id,
        email: user.email 
      },
      secret,
      { expiresIn: '7d' }
    );
    
    return res.status(200).json({
      success: true,
      msg: "Login successful",
      token: jwtToken,
      userId: user._id
    });
    
  } catch (error) {
    console.error('Google login error:', error);
    return res.status(500).json({
      success: false,
      msg: "Internal server error"
    });
  }
};

exports.googleSignup = async (req, res) => {
  try {
    const { token } = req.body;
    
    // Verify the Google token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID',
    });
    
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;
    
    // Check if user already exists
    let existingUser = await userModel.findOne({ 
      $or: [
        { email: email },
        { googleId: googleId }
      ]
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        msg: "User already exists. Please login instead."
      });
    }
    
    // Create new user
    const newUser = new userModel({
      fullName: name,
      email: email,
      password: null, // No password for Google users
      googleId: googleId,
      picture: picture
    });
    
    await newUser.save();
    
    return res.status(201).json({
      success: true,
      msg: "Account created successfully with Google"
    });
    
  } catch (error) {
    console.error('Google signup error:', error);
    return res.status(500).json({
      success: false,
      msg: "Internal server error"
    });
  }
};