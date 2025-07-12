const mongoose = require('mongoose');
const { Schema } = mongoose;

const swapSchema = new Schema({
    initiatorId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    receiverId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    initiatorItemId: {
        type: Schema.Types.ObjectId,
        ref: 'Item',
        required: true,
    },
    receiverItemId: {
        type: Schema.Types.ObjectId,
        ref: 'Item',
        required: true,
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected', 'completed', 'cancelled'],
        default: 'pending',
    },
    message: {
        type: String,
        trim: true,
    },
}, {
    timestamps: true,
});

const Swap = mongoose.model('Swap', swapSchema);

module.exports = Swap;
