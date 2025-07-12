const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    avatar: {
        type: String, // URL to profile image
        default: null
    },
    bio: {
        type: String,
        maxlength: 500
    },
    locationCity: {
        type: String,
        trim: true
    },
    locationState: {
        type: String,
        trim: true
    },
    locationCountry: {
        type: String,
        trim: true
    },
    phone: {
        type: String,
        trim: true
    },
    points: {
        type: Number,
        default: 100,
        min: 0
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    ratingAverage: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    ratingCount: {
        type: Number,
        default: 0
    },
    preferencesSizes: [{
        type: String,
        enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', '4XL', '5XL']
    }],
    preferencesCategories: [{
        type: String,
        enum: ['tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories', 'activewear', 'formal', 'sleepwear']
    }],
    preferencesBrands: [String]
}, {
    timestamps: true
});

const User = mongoose.model('User', userSchema);

module.exports = User;
