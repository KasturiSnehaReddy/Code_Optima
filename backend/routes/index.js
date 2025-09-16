var express = require('express');
const { signUp, login, createProj, saveProject, getProjects, getProject, deleteProject, editProject, getUserInfo, analyzeTimeComplexity, getTimeComplexityAnalysis, generateOptimizedSolution, getOptimizedSolution, googleLogin, googleSignup } = require('../controllers/userController');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.post("/signUp", signUp); // signUp is the controller function
router.post("/login", login); 
router.post("/googleLogin", googleLogin);
router.post("/googleSignup", googleSignup);
router.post("/createProj", createProj); 
router.post("/saveProject", saveProject); 
router.post("/getProjects", getProjects); 
router.post("/getProject", getProject); 
router.post("/deleteProject", deleteProject); 
router.post("/editProject", editProject); 
router.post("/getUserInfo", getUserInfo); 
router.post("/analyzeTimeComplexity", analyzeTimeComplexity);
router.post("/getTimeComplexityAnalysis", getTimeComplexityAnalysis);
router.post("/generateOptimizedSolution", generateOptimizedSolution);
router.post("/getOptimizedSolution", getOptimizedSolution);

module.exports = router;
