const Swap = require('../models/Swap');
const Item = require('../models/Item');
const User = require('../models/User');

// @desc    Create a new swap request
// @route   POST /api/swaps
// @access  Private
const createSwapRequest = async (req, res) => {
    try {
        const { receiverId, initiatorItemId, receiverItemId, message } = req.body;
        const initiatorId = req.user._id; // From auth middleware

        // Basic validation
        if (!receiverId || !initiatorItemId || !receiverItemId) {
            return res.status(400).json({ success: false, message: 'Missing required swap details' });
        }

        // Prevent self-swapping
        if (initiatorId.toString() === receiverId.toString()) {
            return res.status(400).json({ success: false, message: 'Cannot swap with yourself' });
        }

        // Check if items exist and are available
        const [initiatorItem, receiverItem] = await Promise.all([
            Item.findById(initiatorItemId),
            Item.findById(receiverItemId)
        ]);

        if (!initiatorItem || !receiverItem) {
            return res.status(404).json({ success: false, message: 'One or both items not found' });
        }

        if (initiatorItem.status !== 'available' || receiverItem.status !== 'available') {
            return res.status(400).json({ success: false, message: 'One or both items are not available for swap' });
        }

        // Ensure initiator owns initiatorItemId and receiver owns receiverItemId
        if (initiatorItem.userId.toString() !== initiatorId.toString()) {
            return res.status(403).json({ success: false, message: 'You do not own the item you are offering' });
        }
        if (receiverItem.userId.toString() !== receiverId.toString()) {
            return res.status(403).json({ success: false, message: 'The requested item does not belong to the specified receiver' });
        }

        // Check for existing pending swap between these items/users
        const existingSwap = await Swap.findOne({
            $or: [
                { initiatorId, receiverId, initiatorItemId, receiverItemId, status: 'pending' },
                { initiatorId: receiverId, receiverId: initiatorId, initiatorItemId: receiverItemId, receiverItemId: initiatorItemId, status: 'pending' }
            ]
        });

        if (existingSwap) {
            return res.status(400).json({ success: false, message: 'A pending swap request already exists for these items/users.' });
        }

        const swap = await Swap.create({
            initiatorId,
            receiverId,
            initiatorItemId,
            receiverItemId,
            message,
            status: 'pending',
        });

        res.status(201).json({
            success: true,
            message: 'Swap request created successfully!',
            data: swap,
        });
    } catch (error) {
        console.error('Error creating swap request:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create swap request. Please try again later.',
            error: error.message,
        });
    }
};

// @desc    Get a single swap request by ID
// @route   GET /api/swaps/:id
// @access  Private (initiator or receiver)
const getSwapRequestById = async (req, res) => {
    try {
        const swap = await Swap.findById(req.params.id)
            .populate('initiatorId', 'firstName lastName email')
            .populate('receiverId', 'firstName lastName email')
            .populate('initiatorItemId', 'title imageUrls')
            .populate('receiverItemId', 'title imageUrls');

        if (!swap) {
            return res.status(404).json({ success: false, message: 'Swap request not found' });
        }

        // Ensure only initiator or receiver can view the swap
        if (swap.initiatorId._id.toString() !== req.user._id.toString() && swap.receiverId._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized to view this swap request' });
        }

        res.status(200).json({
            success: true,
            data: swap,
        });
    } catch (error) {
        console.error('Error fetching swap request:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch swap request. Please try again later.',
            error: error.message,
        });
    }
};

// @desc    Update swap request status (accept/reject/complete/cancel)
// @route   PUT /api/swaps/:id
// @access  Private (receiver for accept/reject, initiator/receiver for complete/cancel)
const updateSwapStatus = async (req, res) => {
    try {
        const { status } = req.body; // 'accepted', 'rejected', 'completed', 'cancelled'
        const swap = await Swap.findById(req.params.id);

        if (!swap) {
            return res.status(404).json({ success: false, message: 'Swap request not found' });
        }

        // Authorization checks
        const isReceiver = swap.receiverId.toString() === req.user._id.toString();
        const isInitiator = swap.initiatorId.toString() === req.user._id.toString();

        if (!isReceiver && !isInitiator) {
            return res.status(403).json({ success: false, message: 'Not authorized to update this swap request' });
        }

        // State machine for status updates
        switch (status) {
            case 'accepted':
                if (!isReceiver || swap.status !== 'pending') {
                    return res.status(400).json({ success: false, message: 'Invalid action for current swap status or user role' });
                }
                swap.status = 'accepted';
                // Optionally, mark items as pending/unavailable here or in a separate 'complete' step
                await Item.updateMany({ _id: { $in: [swap.initiatorItemId, swap.receiverItemId] } }, { status: 'pending' });
                break;
            case 'rejected':
                if (!isReceiver || swap.status !== 'pending') {
                    return res.status(400).json({ success: false, message: 'Invalid action for current swap status or user role' });
                }
                swap.status = 'rejected';
                // Revert item status if needed (e.g., from pending to available)
                await Item.updateMany({ _id: { $in: [swap.initiatorItemId, swap.receiverItemId] } }, { status: 'available' });
                break;
            case 'completed':
                if ((!isInitiator && !isReceiver) || swap.status !== 'accepted') {
                    return res.status(400).json({ success: false, message: 'Invalid action for current swap status or user role' });
                }
                swap.status = 'completed';
                // Mark items as swapped
                await Item.updateMany({ _id: { $in: [swap.initiatorItemId, swap.receiverItemId] } }, { status: 'swapped' });
                break;
            case 'cancelled':
                if ((!isInitiator && !isReceiver) || (swap.status !== 'pending' && swap.status !== 'accepted')) {
                    return res.status(400).json({ success: false, message: 'Invalid action for current swap status or user role' });
                }
                swap.status = 'cancelled';
                // Revert item status to available
                await Item.updateMany({ _id: { $in: [swap.initiatorItemId, swap.receiverItemId] } }, { status: 'available' });
                break;
            default:
                return res.status(400).json({ success: false, message: 'Invalid swap status provided' });
        }

        await swap.save();

        res.status(200).json({
            success: true,
            message: `Swap status updated to ${status}!`,
            data: swap,
        });
    } catch (error) {
        console.error('Error updating swap status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update swap status. Please try again later.',
            error: error.message,
        });
    }
};

// @desc    Get all swaps (initiated or received) for a user
// @route   GET /api/swaps/user/:userId
// @access  Private (user themselves)
const getUserSwaps = async (req, res) => {
    try {
        const { userId } = req.params;

        if (req.user._id.toString() !== userId) {
            return res.status(403).json({ success: false, message: 'Not authorized to view these swaps' });
        }

        const swaps = await Swap.find({
            $or: [
                { initiatorId: userId },
                { receiverId: userId }
            ]
        })
            .populate('initiatorId', 'firstName lastName email')
            .populate('receiverId', 'firstName lastName email')
            .populate('initiatorItemId', 'title imageUrls')
            .populate('receiverItemId', 'title imageUrls')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: swaps.length,
            data: swaps,
        });
    } catch (error) {
        console.error('Error fetching user swaps:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user swaps. Please try again later.',
            error: error.message,
        });
    }
};

// @desc    Get pending swaps for a user (where they are the receiver)
// @route   GET /api/swaps/user/:userId/pending
// @access  Private (user themselves)
const getPendingSwapsForUser = async (req, res) => {
    try {
        const { userId } = req.params;

        if (req.user._id.toString() !== userId) {
            return res.status(403).json({ success: false, message: 'Not authorized to view these swaps' });
        }

        const pendingSwaps = await Swap.find({
            receiverId: userId,
            status: 'pending'
        })
            .populate('initiatorId', 'firstName lastName email')
            .populate('receiverId', 'firstName lastName email')
            .populate('initiatorItemId', 'title imageUrls')
            .populate('receiverItemId', 'title imageUrls')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: pendingSwaps.length,
            data: pendingSwaps,
        });
    } catch (error) {
        console.error('Error fetching pending swaps for user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pending swaps. Please try again later.',
            error: error.message,
        });
    }
};


module.exports = {
    createSwapRequest,
    getSwapRequestById,
    updateSwapStatus,
    getUserSwaps,
    getPendingSwapsForUser
};
