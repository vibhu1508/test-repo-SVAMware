const express = require('express');
const {
    createRedemption,
    getRedemptionById,
    getUserRedemptions
} = require('../controllers/redemptionController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.route('/')
    .post(protect, createRedemption);

router.route('/:id')
    .get(protect, getRedemptionById);

router.get('/user/:userId', protect, getUserRedemptions);

module.exports = router;
