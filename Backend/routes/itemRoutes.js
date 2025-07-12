const express = require('express');
const {
    createItem,
    getAllItems,
    getItemById,
    updateItem,
    deleteItem,
    getUserItems
} = require('../controllers/itemController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.route('/')
    .post(protect, createItem)
    .get(getAllItems);

router.route('/:id')
    .get(getItemById)
    .put(protect, updateItem)
    .delete(protect, deleteItem);

router.get('/user/:userId', getUserItems); // Get items listed by a specific user

module.exports = router;
