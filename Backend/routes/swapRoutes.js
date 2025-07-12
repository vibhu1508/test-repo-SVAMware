const express = require('express');
const {
    createSwapRequest,
    getSwapRequestById,
    updateSwapStatus,
    getUserSwaps,
    getPendingSwapsForUser
} = require('../controllers/swapController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.route('/')
    .post(protect, createSwapRequest);

router.route('/:id')
    .get(protect, getSwapRequestById)
    .put(protect, updateSwapStatus);

router.get('/user/:userId', protect, getUserSwaps); // Get all swaps (initiated or received) for a user
router.get('/user/:userId/pending', protect, getPendingSwapsForUser); // Get pending swaps for a user

module.exports = router;
