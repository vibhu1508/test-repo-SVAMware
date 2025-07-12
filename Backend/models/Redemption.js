const mongoose = require('mongoose');
const { Schema } = mongoose;

const redemptionSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    itemId: {
        type: Schema.Types.ObjectId,
        ref: 'Item',
        required: true,
    },
    pointsUsed: {
        type: Number,
        required: true,
        min: 1,
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'cancelled'],
        default: 'completed',
    },
}, {
    timestamps: true,
});

const Redemption = mongoose.model('Redemption', redemptionSchema);

module.exports = Redemption;
