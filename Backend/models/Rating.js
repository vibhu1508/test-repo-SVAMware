const mongoose = require('mongoose');
const { Schema } = mongoose;

const ratingSchema = new Schema({
    raterId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    ratedUserId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
    },
    comment: {
        type: String,
        trim: true,
    },
    transactionType: {
        type: String,
        enum: ['swap', 'redemption'],
    },
    transactionId: {
        type: Schema.Types.ObjectId,
    },
}, {
    timestamps: true,
});

const Rating = mongoose.model('Rating', ratingSchema);

module.exports = Rating;
