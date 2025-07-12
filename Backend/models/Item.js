const mongoose = require('mongoose');
const { Schema } = mongoose;

const itemSchema = new Schema({
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    category: {
        type: String,
        enum: ['tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories', 'activewear', 'formal', 'sleepwear', 'other'],
        required: true,
    },
    condition: {
        type: String,
        enum: ['new', 'like new', 'gently used', 'well worn'],
        required: true,
    },
    size: {
        type: String,
        enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', '4XL', '5XL', 'one size'],
        required: true,
    },
    tags: {
        type: [String],
        default: [],
    },
    imageUrls: {
        type: [String],
        required: true,
    },
    status: {
        type: String,
        enum: ['available', 'swapped', 'redeemed', 'pending'],
        default: 'available',
    },
    pointsValue: {
        type: Number,
        default: 0,
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
}, {
    timestamps: true,
});

const Item = mongoose.model('Item', itemSchema);

module.exports = Item;
