const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// For text-only input, use the gemini-pro model
const textModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// For text-and-image input, use the gemini-pro-vision model
const visionModel = genAI.getGenerativeModel({ model: 'gemini-pro-vision' });

// For flash models (if available and preferred)
const flashTextModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
const flashVisionModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-vision' });


module.exports = { textModel, visionModel, flashTextModel, flashVisionModel };
