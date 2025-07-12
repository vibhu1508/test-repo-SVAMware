const express = require('express');
const {
    createRating,
    getRatingById,
    getUserRatings,
    getRatingsReceivedByUser
} = require('../controllers/ratingController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.route('/')
    .post(protect, createRating);

router.route('/:id')
    .get(protect, getRatingById);

router.get('/user/:userId/given', protect, getUserRatings); // Ratings given by a user
router.get('/user/:userId/received', protect, getRatingsReceivedByUser); // Ratings received by a user

module.exports = router;
