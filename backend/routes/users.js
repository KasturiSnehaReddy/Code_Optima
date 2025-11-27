var express = require('express');
var router = express.Router();
const userController = require('../controllers/userController');

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

// Get user's competitive session history
router.post('/sessions', userController.getUserSessions);

module.exports = router;
