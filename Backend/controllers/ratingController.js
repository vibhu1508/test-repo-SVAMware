const Rating = require('../models/Rating');
const User = require('../models/User');
const mongoose = require('mongoose');

// @desc    Create a new rating
// @route   POST /api/ratings
// @access  Private
const createRating = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { ratedUserId, rating, comment, transactionType, transactionId } = req.body;
        const raterId = req.user._id; // From auth middleware

        // Basic validation
        if (!ratedUserId || !rating) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ success: false, message: 'Missing required rating details' });
        }

        if (raterId.toString() === ratedUserId.toString()) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ success: false, message: 'Cannot rate yourself' });
        }

        const ratedUser = await User.findById(ratedUserId).session(session);
        if (!ratedUser) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ success: false, message: 'User being rated not found' });
        }

        // Check if a rating already exists for this transaction (to prevent multiple ratings for one event)
        if (transactionType && transactionId) {
            const existingRating = await Rating.findOne({
                raterId,
                ratedUserId,
                transactionType,
                transactionId
            }).session(session);
            if (existingRating) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ success: false, message: 'You have already rated this transaction.' });
            }
        }

        const newRating = await Rating.create([{
            raterId,
            ratedUserId,
            rating,
            comment,
            transactionType,
            transactionId,
        }], { session });

        // Update the rated user's average rating and count
        const userRatings = await Rating.find({ ratedUserId }).session(session);

        const totalRating = userRatings.reduce((sum, r) => sum + r.rating, 0);
        ratedUser.ratingCount = userRatings.length;
        ratedUser.ratingAverage = ratedUser.ratingCount > 0 ? (totalRating / ratedUser.ratingCount) : 0;

        await ratedUser.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.status(201).json({
            success: true,
            message: 'Rating created successfully!',
            data: newRating[0],
            updatedUserRating: {
                average: ratedUser.ratingAverage,
                count: ratedUser.ratingCount,
            },
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Error creating rating:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create rating. Please try again later.',
            error: error.message,
        });
    }
};

// @desc    Get a single rating by ID
// @route   GET /api/ratings/:id
// @access  Private (rater, rated user, or admin)
const getRatingById = async (req, res) => {
    try {
        const rating = await Rating.findById(req.params.id)
            .populate('raterId', 'firstName lastName email')
            .populate('ratedUserId', 'firstName lastName email ratingAverage');

        if (!rating) {
            return res.status(404).json({ success: false, message: 'Rating not found' });
        }

        // Authorization
        if (rating.raterId._id.toString() !== req.user._id.toString() && rating.ratedUserId._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to view this rating' });
        }

        res.status(200).json({
            success: true,
            data: rating,
        });
    } catch (error) {
        console.error('Error fetching rating by ID:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch rating. Please try again later.',
            error: error.message,
        });
    }
};

// @desc    Get all ratings given by a specific user
// @route   GET /api/ratings/user/:userId/given
// @access  Private (user themselves or admin)
const getUserRatings = async (req, res) => {
    try {
        const { userId } = req.params;

        if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to view these ratings' });
        }

        const ratings = await Rating.find({ raterId: userId })
            .populate('raterId', 'firstName lastName email')
            .populate('ratedUserId', 'firstName lastName email ratingAverage')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: ratings.length,
            data: ratings,
        });
    } catch (error) {
        console.error('Error fetching user given ratings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch ratings. Please try again later.',
            error: error.message,
        });
    }
};

// @desc    Get all ratings received by a specific user
// @route   GET /api/ratings/user/:userId/received
// @access  Private (user themselves or admin)
const getRatingsReceivedByUser = async (req, res) => {
    try {
        const { userId } = req.params;

        if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to view these ratings' });
        }

        const ratings = await Rating.find({ ratedUserId: userId })
            .populate('raterId', 'firstName lastName email')
            .populate('ratedUserId', 'firstName lastName email ratingAverage')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: ratings.length,
            data: ratings,
        });
    } catch (error) {
        console.error('Error fetching user received ratings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch ratings. Please try again later.',
            error: error.message,
        });
    }
};

module.exports = {
    createRating,
    getRatingById,
    getUserRatings,
    getRatingsReceivedByUser,
};
