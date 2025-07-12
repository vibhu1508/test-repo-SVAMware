const { textModel, visionModel, flashTextModel, flashVisionModel } = require('../config/gemini');
const Item = require('../models/Item');
const User = require('../models/User');
const Swap = require('../models/Swap');
const Redemption = require('../models/Redemption');

// Helper function to convert image URL to GoogleGenerativeAI.Part
// This is a placeholder. In a real app, you'd likely download the image
// or use a service that provides base64 encoding directly.
async function urlToGenerativePart(url) {
    // This is a simplified example. In a real application, you would
    // fetch the image from the URL and convert it to a base64 string.
    // For now, we'll assume the URL points to a publicly accessible image
    // and Gemini can access it directly, or you'd implement a proxy.
    // For actual image content, you'd need to fetch and base64 encode it.
    // Example:
    // const response = await fetch(url);
    // const arrayBuffer = await response.arrayBuffer();
    // const base64 = Buffer.from(arrayBuffer).toString('base64');
    // return {
    //     inlineData: {
    //         data: base64,
    //         mimeType: 'image/jpeg' // or appropriate mime type
    //     },
    // };
    return {
        text: `Image at URL: ${url}. Please analyze this image for clothing details.`
    }; // Placeholder for image analysis
}


// @desc    Generate item description using AI
// @route   POST /api/ai/generate-description
// @access  Private
const generateDescription = async (req, res) => {
    try {
        const { title, category, condition, size, tags, notes } = req.body;

        const prompt = `Generate a detailed and appealing product description for a clothing item based on the following details:
        Title: ${title}
        Category: ${category}
        Condition: ${condition}
        Size: ${size}
        Tags: ${tags ? tags.join(', ') : 'None'}
        Additional Notes: ${notes || 'None'}

        Focus on highlighting key features, style, and potential uses. Keep it concise but informative.`;

        const result = await flashTextModel.generateContent(prompt);
        const response = await result.response;
        const generatedText = response.text();

        res.status(200).json({
            success: true,
            data: { description: generatedText },
        });
    } catch (error) {
        console.error('Error generating description:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate description. Please try again later.',
            error: error.message,
        });
    }
};

// @desc    Auto-tag and categorize item using AI
// @route   POST /api/ai/auto-tag-categorize
// @access  Private
const autoTagCategorize = async (req, res) => {
    try {
        const { textInput, imageUrl } = req.body; // Either text or image URL

        let prompt = 'Analyze the following clothing item and suggest relevant categories and tags. Provide output as a JSON object with "categories" (array of strings) and "tags" (array of strings). Categories should be from: tops, bottoms, dresses, outerwear, shoes, accessories, activewear, formal, sleepwear, other.';
        let parts = [];

        if (textInput) {
            prompt += `\nText Description: ${textInput}`;
            parts.push({ text: prompt });
        } else if (imageUrl) {
            // For image input, you'd typically convert the image to base64 or provide a direct URL if Gemini supports it.
            // This is a placeholder for image processing.
            // For now, we'll send a text prompt indicating an image is present.
            prompt += `\nAnalyze the image to determine categories and tags.`;
            parts.push(await urlToGenerativePart(imageUrl)); // Placeholder for actual image part
            parts.push({ text: prompt });
        } else {
            return res.status(400).json({ success: false, message: 'Either textInput or imageUrl is required.' });
        }

        const modelToUse = imageUrl ? flashVisionModel : flashTextModel;
        const result = await modelToUse.generateContent(parts);
        const response = await result.response;
        const generatedText = response.text();

        // Attempt to parse JSON from the AI response
        let parsedResponse;
        try {
            parsedResponse = JSON.parse(generatedText);
        } catch (parseError) {
            console.warn('AI response was not valid JSON:', generatedText);
            // Fallback if AI doesn't return perfect JSON
            return res.status(200).json({
                success: true,
                message: 'AI generated response, but could not parse as JSON. Raw response provided.',
                data: { rawResponse: generatedText },
            });
        }

        res.status(200).json({
            success: true,
            data: parsedResponse,
        });
    } catch (error) {
        console.error('Error auto-tagging/categorizing:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to auto-tag/categorize. Please try again later.',
            error: error.message,
        });
    }
};

// @desc    Get personalized swap suggestions for a user
// @route   GET /api/ai/personalized-swap-suggestions/:userId
// @access  Private (user themselves)
const getPersonalizedSwapSuggestions = async (req, res) => {
    try {
        const { userId } = req.params;
        if (req.user._id.toString() !== userId) {
            return res.status(403).json({ success: false, message: 'Not authorized to view these suggestions' });
        }

        const user = await User.findById(userId)
            .populate('listings', 'title category size condition tags');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const userPreferences = user.preferencesCategories || [];
        const userSizes = user.preferencesSizes || [];
        const userBrands = user.preferencesBrands || [];
        const userListings = user.listings.map(item => ({
            id: item._id,
            title: item.title,
            category: item.category,
            size: item.size,
            condition: item.condition,
            tags: item.tags,
        }));

        // Fetch available items that are not listed by the current user
        const availableItems = await Item.find({
            status: 'available',
            userId: { $ne: userId }, // Not the current user's items
        })
            .select('title description category condition size tags imageUrls pointsValue userId')
            .populate('userId', 'firstName lastName')
            .limit(50); // Limit items for AI processing

        const prompt = `Given the user's preferences and their listed items, suggest other available clothing items they might be interested in swapping for.
        User Preferences:
        Categories: ${userPreferences.join(', ') || 'None'}
        Sizes: ${userSizes.join(', ') || 'None'}
        Brands: ${userBrands.join(', ') || 'None'}

        User's Listed Items:
        ${userListings.map(item => `- ${item.title} (${item.category}, ${item.size}, ${item.condition})`).join('\n')}

        Available Items (to suggest from):
        ${availableItems.map(item => `- ${item.title} (${item.category}, ${item.size}, ${item.condition}, listed by ${item.userId.firstName})`).join('\n')}

        Provide a list of up to 5 suggested item IDs from the "Available Items" list, along with a brief reason for each suggestion.
        Format the output as a JSON array of objects, each with 'itemId' and 'reason'.`;

        const result = await flashTextModel.generateContent(prompt);
        const response = await result.response;
        const generatedText = response.text();

        let suggestions;
        try {
            suggestions = JSON.parse(generatedText);
            // Filter to ensure only valid item IDs are returned
            suggestions = suggestions.filter(s => availableItems.some(item => item._id.toString() === s.itemId));
        } catch (parseError) {
            console.warn('AI personalized suggestions response was not valid JSON:', generatedText);
            suggestions = []; // Fallback to empty array
        }

        res.status(200).json({
            success: true,
            data: suggestions,
        });
    } catch (error) {
        console.error('Error getting personalized swap suggestions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get personalized swap suggestions. Please try again later.',
            error: error.message,
        });
    }
};

// @desc    Get sustainability impact for a user
// @route   GET /api/ai/sustainability-impact/:userId
// @access  Private (user themselves)
const getSustainabilityImpact = async (req, res) => {
    try {
        const { userId } = req.params;
        if (req.user._id.toString() !== userId) {
            return res.status(403).json({ success: false, message: 'Not authorized to view sustainability impact' });
        }

        const completedSwaps = await Swap.countDocuments({
            $or: [{ initiatorId: userId }, { receiverId: userId }],
            status: 'completed',
        });

        const completedRedemptions = await Redemption.countDocuments({
            userId: userId,
            status: 'completed',
        });

        const totalTransactions = completedSwaps + completedRedemptions;

        let impactMessage = `You have completed ${totalTransactions} clothing exchanges on ReWear.`;

        if (totalTransactions > 0) {
            const prompt = `Based on a user completing ${completedSwaps} swaps and ${completedRedemptions} redemptions on a clothing exchange platform, generate a short, encouraging message about their positive environmental impact. Focus on themes like reducing waste, extending clothing life, and promoting circular fashion.`;
            const result = await flashTextModel.generateContent(prompt);
            const response = await result.response;
            impactMessage = response.text();
        } else {
            impactMessage += " Keep swapping and redeeming to make a positive impact!";
        }


        res.status(200).json({
            success: true,
            data: {
                completedSwaps,
                completedRedemptions,
                totalTransactions,
                impactMessage,
            },
        });
    } catch (error) {
        console.error('Error getting sustainability impact:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get sustainability impact. Please try again later.',
            error: error.message,
        });
    }
};

// @desc    Suggest compatible items to bundle or swap with a given item
// @route   GET /api/ai/compatible-item-suggestions/:itemId
// @access  Public
const getCompatibleItemSuggestions = async (req, res) => {
    try {
        const { itemId } = req.params;

        const targetItem = await Item.findById(itemId)
            .select('title description category condition size tags imageUrls userId');

        if (!targetItem) {
            return res.status(404).json({ success: false, message: 'Target item not found' });
        }

        // Fetch other available items (excluding the target item and items from the same user)
        const otherAvailableItems = await Item.find({
            status: 'available',
            _id: { $ne: itemId },
            userId: { $ne: targetItem.userId }, // Exclude items from the same uploader
        })
            .select('title description category condition size tags imageUrls')
            .limit(50); // Limit items for AI processing

        const prompt = `Given the following item, suggest other available clothing items that would be compatible for bundling or swapping. Consider style, category, size (if complementary), and overall aesthetic.
        Target Item:
        Title: ${targetItem.title}
        Description: ${targetItem.description || 'N/A'}
        Category: ${targetItem.category}
        Condition: ${targetItem.condition}
        Size: ${targetItem.size}
        Tags: ${targetItem.tags ? targetItem.tags.join(', ') : 'None'}

        Other Available Items (to suggest from):
        ${otherAvailableItems.map(item => `- ${item.title} (${item.category}, ${item.size}, ${item.condition})`).join('\n')}

        Provide a list of up to 3 suggested item IDs from the "Other Available Items" list, along with a brief reason for each suggestion (e.g., "matches style", "complementary size", "completes an outfit").
        Format the output as a JSON array of objects, each with 'itemId' and 'reason'.`;

        const result = await flashTextModel.generateContent(prompt);
        const response = await result.response;
        const generatedText = response.text();

        let suggestions;
        try {
            suggestions = JSON.parse(generatedText);
            // Filter to ensure only valid item IDs are returned
            suggestions = suggestions.filter(s => otherAvailableItems.some(item => item._id.toString() === s.itemId));
        } catch (parseError) {
            console.warn('AI compatible item suggestions response was not valid JSON:', generatedText);
            suggestions = []; // Fallback to empty array
        }

        res.status(200).json({
            success: true,
            data: suggestions,
        });
    } catch (error) {
        console.error('Error getting compatible item suggestions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get compatible item suggestions. Please try again later.',
            error: error.message,
        });
    }
};


module.exports = {
    generateDescription,
    autoTagCategorize,
    getPersonalizedSwapSuggestions,
    getSustainabilityImpact,
    getCompatibleItemSuggestions,
};
