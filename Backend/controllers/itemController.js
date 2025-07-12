const Item = require('../models/Item');
const User = require('../models/User');

// @desc    Create a new item
// @route   POST /api/items
// @access  Private
const createItem = async (req, res) => {
    try {
        const { title, description, category, condition, size, tags, imageUrls, pointsValue } = req.body;

        // Ensure the user is authenticated and their ID is available from the protect middleware
        if (!req.user || !req.user._id) {
            return res.status(401).json({ success: false, message: 'Not authorized, user ID missing' });
        }

        const item = await Item.create({
            title,
            description,
            category,
            condition,
            size,
            tags,
            imageUrls,
            pointsValue,
            userId: req.user._id, // Associate the item with the logged-in user
        });

        res.status(201).json({
            success: true,
            message: 'Item created successfully!',
            data: item,
        });
    } catch (error) {
        console.error('Error creating item:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create item. Please try again later.',
            error: error.message,
        });
    }
};

// @desc    Get all items
// @route   GET /api/items
// @access  Public
const getAllItems = async (req, res) => {
    try {
        const { category, size, condition, search } = req.query;
        const query = { status: 'available' }; // Only show available items by default

        if (category) {
            query.category = category;
        }
        if (size) {
            query.size = size;
        }
        if (condition) {
            query.condition = condition;
        }
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { tags: { $regex: search, $options: 'i' } },
            ];
        }

        const items = await Item.find(query)
            .populate('userId', 'firstName lastName email avatar ratingAverage')
            .sort({ createdAt: -1 }); // Order by newest first

        res.status(200).json({
            success: true,
            count: items.length,
            data: items,
        });
    } catch (error) {
        console.error('Error fetching items:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch items. Please try again later.',
            error: error.message,
        });
    }
};

// @desc    Get single item by ID
// @route   GET /api/items/:id
// @access  Public
const getItemById = async (req, res) => {
    try {
        const item = await Item.findById(req.params.id)
            .populate('userId', 'firstName lastName email avatar ratingAverage');

        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }

        res.status(200).json({
            success: true,
            data: item,
        });
    } catch (error) {
        console.error('Error fetching item by ID:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch item. Please try again later.',
            error: error.message,
        });
    }
};

// @desc    Update an item
// @route   PUT /api/items/:id
// @access  Private (Owner only)
const updateItem = async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);

        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }

        // Check if the logged-in user is the owner of the item
        if (item.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized to update this item' });
        }

        const updatedItem = await Item.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });

        res.status(200).json({
            success: true,
            message: 'Item updated successfully!',
            data: updatedItem,
        });
    } catch (error) {
        console.error('Error updating item:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update item. Please try again later.',
            error: error.message,
        });
    }
};

// @desc    Delete an item
// @route   DELETE /api/items/:id
// @access  Private (Owner only)
const deleteItem = async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);

        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }

        // Check if the logged-in user is the owner of the item
        if (item.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized to delete this item' });
        }

        await item.remove();

        res.status(200).json({
            success: true,
            message: 'Item deleted successfully!',
        });
    } catch (error) {
        console.error('Error deleting item:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete item. Please try again later.',
            error: error.message,
        });
    }
};

// @desc    Get items listed by a specific user
// @route   GET /api/items/user/:userId
// @access  Public
const getUserItems = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const items = await Item.find({ userId: userId })
            .populate('userId', 'firstName lastName email avatar ratingAverage')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: items.length,
            data: items,
        });
    } catch (error) {
        console.error('Error fetching user items:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user items. Please try again later.',
            error: error.message,
        });
    }
};


module.exports = {
    createItem,
    getAllItems,
    getItemById,
    updateItem,
    deleteItem,
    getUserItems
};
