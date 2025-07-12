const express = require('express');
const {
    generateDescription,
    autoTagCategorize,
    getPersonalizedSwapSuggestions,
    getSustainabilityImpact,
    getCompatibleItemSuggestions
} = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/generate-description', protect, generateDescription);
router.post('/auto-tag-categorize', protect, autoTagCategorize);
router.get('/personalized-swap-suggestions/:userId', protect, getPersonalizedSwapSuggestions);
router.get('/sustainability-impact/:userId', protect, getSustainabilityImpact);
router.get('/compatible-item-suggestions/:itemId', protect, getCompatibleItemSuggestions);

module.exports = router;
