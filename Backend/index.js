const express = require('express');
const app = express();
const connectDB = require('./config/database');
const authRoute = require('./routes/authRoute.js');
const port = 8080;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Connect to MongoDB
connectDB();

app.get('/', (req, res) => {
  res.send('ReWear Backend is running!');
});

app.listen(port, () => {
  console.log(`Server is listening on ${port}.`);
});

app.use('/api/auth', authRoute);
app.use('/api/items', require('./routes/itemRoutes'));
app.use('/api/swaps', require('./routes/swapRoutes'));
app.use('/api/redemptions', require('./routes/redemptionRoutes'));
app.use('/api/ratings', require('./routes/ratingRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));
