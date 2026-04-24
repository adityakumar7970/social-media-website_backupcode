require('dotenv').config();

console.log("JWT_SECRET:",process.env.JWT_SECRET);
console.log("MONGODB_URI:",process.env.MONGODB_URI);

const path = require('path');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const User = require('./models/User');
const Follow = require('./models/Follow');
const authRoutes = require('./routes/authRoutes');
const socialRoutes = require('./routes/socialRoutes');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://singhaditya73128_db_user:fNJKFQCA5TFnq2qF@clusterone.60cqypu.mongodb.net/socialApp';

const corsOptions = {
  origin: '*', // Allow requests from any origin (including mobile)
  credentials: false, // Cannot use credentials with origin: '*'
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '15mb' }));
app.use(express.static(path.join(__dirname, '../frontend')));

app.use('/api/auth', authRoutes);
app.use('/api/social', socialRoutes);

app.get('/api/auth/me', require('./middleware/auth'), (req, res) => {
  return res.json({
    success: true,
    user: req.user,
  });
});

app.get('/api/user/me', require('./middleware/auth'), async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid token user.' });
    }

    const followers = await Follow.countDocuments({ followingId: user._id });
    const following = await Follow.countDocuments({ followerId: user._id });

    return res.json({
      success: true,
      user: {
        userId: user._id.toString(),
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        mobile: user.mobile,
        avatar: user.avatar || '',
        bio: user.bio || '',
        followers,
        following,
      },
    });
  } catch (error) {
    console.error('User me error:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch current user.' });
  }
});

app.get('/api/user/:userId', require('./middleware/auth'), async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const followers = await Follow.countDocuments({ followingId: user._id });
    const following = await Follow.countDocuments({ followerId: user._id });

    return res.json({
      success: true,
      user: {
        userId: user._id.toString(),
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        mobile: user.mobile,
        avatar: user.avatar || '',
        bio: user.bio || '',
        followers,
        following,
      },
    });
  } catch (error) {
    console.error('User fetch error:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch user.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });
