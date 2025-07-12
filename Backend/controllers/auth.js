const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET || "SVAMware", {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
};

const register = async (req, res) => {
    try {
        const { email, password, firstName, lastName, location, phone } = req.body;

        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email address'
            });
        }

        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const user = await User.create({
            email: email.toLowerCase(),
            password: hashedPassword,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phone: phone?.trim(),
            locationCity: location?.city?.trim(),
            locationState: location?.state?.trim(),
            locationCountry: location?.country?.trim(),
            points: 100 // Starting points
        });

        const token = generateToken(user._id);

        const userResponse = {
            _id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
            bio: user.bio,
            locationCity: user.locationCity,
            locationState: user.locationState,
            locationCountry: user.locationCountry,
            phone: user.phone,
            points: user.points,
            role: user.role,
            ratingAverage: user.ratingAverage,
            ratingCount: user.ratingCount,
            isActive: user.isActive,
            preferencesSizes: user.preferencesSizes,
            preferencesCategories: user.preferencesCategories,
            preferencesBrands: user.preferencesBrands,
            createdAt: user.createdAt
        };

        res.status(201).json({
            success: true,
            message: 'Account created successfully! Welcome to ReWear.',
            data: {
                user: userResponse,
                token
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed. Please try again later.',
            error: error.message
        });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Your account has been deactivated. Please contact support.'
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const token = generateToken(user._id);

        const userResponse = {
            _id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
            bio: user.bio,
            locationCity: user.locationCity,
            locationState: user.locationState,
            locationCountry: user.locationCountry,
            phone: user.phone,
            points: user.points,
            role: user.role,
            ratingAverage: user.ratingAverage,
            ratingCount: user.ratingCount,
            isActive: user.isActive,
            preferencesSizes: user.preferencesSizes,
            preferencesCategories: user.preferencesCategories,
            preferencesBrands: user.preferencesBrands,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        };

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: userResponse,
                token
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed. Please try again later.',
            error: error.message
        });
    }
};


module.exports = {
    register,
    login   
}
