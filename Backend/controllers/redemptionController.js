const Redemption = require('../models/Redemption');
const Item = require('../models/Item');
const User = require('../models/User');
const mongoose = require('mongoose');

// @desc    Create a new redemption
// @route   POST /api/redemptions
// @access  Private
const createRedemption = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { itemId, pointsUsed } = req.body;
        const userId = req.user._id; // From auth middleware

        // Basic validation
        if (!itemId || !pointsUsed) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ success: false, message: 'Missing required redemption details' });
        }

        const user = await User.findById(userId).session(session);
        const item = await Item.findById(itemId).session(session);

        if (!user || !item) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ success: false, message: 'User or Item not found' });
        }

        if (item.status !== 'available') {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ success: false, message: 'Item is not available for redemption' });
        }

        if (item.pointsValue !== pointsUsed) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ success: false, message: 'Points used do not match item\'s points value' });
        }

        if (user.points < pointsUsed) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ success: false, message: 'Insufficient points to redeem this item' });
        }

        // Deduct points from user
        user.points -= pointsUsed;
        await user.save({ session });

        // Mark item as redeemed
        item.status = 'redeemed';
        await item.save({ session });

        // Create redemption record
        const redemption = await Redemption.create([{
            userId,
            itemId,
            pointsUsed,
            status: 'completed',
        }], { session });

        await session.commitTransaction();
        session.endSession();

        res.status(201).json({
            success: true,
            message: 'Item redeemed successfully!',
            data: redemption[0],
            userPoints: user.points, // Return updated user points
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Error creating redemption:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create redemption. Please try again later.',
            error: error.message,
        });
    }
};

// @desc    Get a single redemption by ID
// @route   GET /api/redemptions/:id
// @access  Private (redeemer or admin)
const getRedemptionById = async (req, res) => {
    try {
        const redemption = await Redemption.findById(req.params.id)
            .populate('userId', 'firstName lastName email points')
            .populate('itemId', 'title imageUrls pointsValue');

        if (!redemption) {
            return res.status(404).json({ success: false, message: 'Redemption not found' });
        }

        // Ensure only the redeemer or an admin can view this redemption
        if (redemption.userId._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to view this redemption' });
        }

        res.status(200).json({
            success: true,
            data: redemption,
        });
    } catch (error) {
        console.error('Error fetching redemption by ID:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch redemption. Please try again later.',
            error: error.message,
        });
    }
};

// @desc    Get all redemptions for a user
// @route   GET /api/redemptions/user/:userId
// @access  Private (user themselves or admin)
const getUserRedemptions = async (req, res) => {
    try {
        const { userId } = req.params;

        // Ensure only the user themselves or an admin can view their redemptions
        if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to view these redemptions' });
        }

        const redemptions = await Redemption.find({ userId: userId })
            .populate('userId', 'firstName lastName email points')
            .populate('itemId', 'title imageUrls pointsValue')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: redemptions.length,
            data: redemptions,
        });
    } catch (error) {
        console.error('Error fetching user redemptions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user redemptions. Please try again later.',
            error: error.message,
        });
    }
};

module.exports = {
    createRedemption,
    getRedemptionById,
    getUserRedemptions,
};
