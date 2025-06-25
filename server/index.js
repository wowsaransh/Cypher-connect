const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const http = require('http');
require('dotenv').config();
const connectDB = require('./db');
const User = require('./models/User');
const Message = require('./models/Message');
const Friend = require('./models/Friend');

const app = express();
const httpServer = http.createServer(app);

// Middleware
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

// Connect to MongoDB
connectDB().then(() => {
  httpServer.listen(3001, () => {
    console.log('Server running on port 3001');
  });
});

// ======================
// Enhanced Auth Endpoints
// ======================
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const existingUser = await User.findOne({ 
      username: { $regex: new RegExp(`^${username}$`, 'i') } 
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const user = new User({
      username: username.toLowerCase(),
      password: await bcrypt.hash(password, 10)
    });
    
    await user.save();
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Registration Error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ 
      username: { $regex: new RegExp(`^${username}$`, 'i') } 
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, username: user.username });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ======================
// Enhanced Friend System
// ======================
app.get('/api/users', async (req, res) => {
  try {
    const { search, currentUser } = req.query;
    
    const users = await User.find({
      username: { 
        $regex: search || '', 
        $options: 'i',
        $ne: currentUser // Exclude current user
      }
    }).select('username');

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
});

app.post('/api/friends/request', async (req, res) => {
  try {
    const { requester, recipient } = req.body;

    // Case-insensitive self-request check
    if (requester.toLowerCase() === recipient.toLowerCase()) {
      return res.status(400).json({ error: 'Cannot add yourself' });
    }

    const [requesterUser, recipientUser] = await Promise.all([
      User.findOne({ username: requester }),
      User.findOne({ username: recipient })
    ]);

    if (!requesterUser || !recipientUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const existingRequest = await Friend.findOne({
      $or: [
        { requester: requesterUser._id, recipient: recipientUser._id },
        { requester: recipientUser._id, recipient: requesterUser._id }
      ]
    });

    if (existingRequest) {
      return res.status(400).json({ error: 'Request already exists' });
    }

    const newRequest = new Friend({
      requester: requesterUser._id,
      recipient: recipientUser._id,
      status: 'pending'
    });

    await newRequest.save();
    
    // Add friend relationship to both users
    await User.findByIdAndUpdate(requesterUser._id, {
      $addToSet: { friends: newRequest._id }
    });
    
    await User.findByIdAndUpdate(recipientUser._id, {
      $addToSet: { friends: newRequest._id }
    });

    res.status(201).json(newRequest);
  } catch (err) {
    console.error('Friend request error:', err);
    res.status(500).json({ error: 'Failed to send request' });
  }
});

// Get pending friend requests
app.get('/api/friends/requests', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const user = await User.findOne({ username: decoded.username });

const requests = await Friend.find({
  recipient: user._id,
  status: 'pending'
}).populate('requester', 'username');

res.json(requests);

  } catch (err) {
    res.status(500).json({ error: 'Failed to load requests' });
  }
});

// Accept/reject friend request
app.patch('/api/friends/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await Friend.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('requester recipient');
    
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update request' });
  }
});

// ======================
// WebSocket Implementation
// ======================
const io = require('socket.io')(httpServer, {
  cors: { 
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

const onlineUsers = new Map();

io.on('connection', (socket) => {
  socket.on('set-online', async (username) => {
    onlineUsers.set(socket.id, username);
    socket.join(username);

    const user = await User.findOne({ username })
      .populate({
        path: 'friends',
        populate: [{ path: 'requester' }, { path: 'recipient' }]
      });

    if (user?.friends) {
      user.friends.forEach(friend => {
        if (friend.status === 'accepted') {
          const otherUser = friend.requester.username === username 
            ? friend.recipient.username 
            : friend.requester.username;
          socket.to(otherUser).emit('friend-online', username);
        }
      });
    }
  });

  // Message handling
  socket.on('message', async (msg) => {
    try {
      const message = new Message({
        text: msg.text,
        username: msg.username,
        timestamp: new Date(),
        isPrivate: false
      });
      await message.save();
      io.emit('message', message);
    } catch (err) {
      console.error('Message error:', err);
    }
  });

  // Private messaging
  socket.on('private-message', async ({ to, text }) => {
    try {
      const from = onlineUsers.get(socket.id);
      const message = new Message({
        text,
        username: from,
        to,
        isPrivate: true,
        timestamp: new Date()
      });
      await message.save();
      socket.to(to).emit('private-message', message);
      socket.emit('private-message', message);
    } catch (err) {
      console.error('Private message error:', err);
    }
  });

  // Message history
  socket.on('get-initial-messages', async (callback) => {
    try {
      const messages = await Message.find({ isPrivate: false })
        .sort({ timestamp: 1 })
        .limit(100);
      callback(messages);
    } catch (err) {
      console.error('Message history error:', err);
      callback([]);
    }
  });

  socket.on('get-private-messages', async (withUser, callback) => {
    try {
      const currentUser = onlineUsers.get(socket.id);
      const messages = await Message.find({
        $or: [
          { username: currentUser, to: withUser, isPrivate: true },
          { username: withUser, to: currentUser, isPrivate: true }
        ]
      }).sort({ timestamp: 1 });
      callback(messages);
    } catch (err) {
      console.error('Private history error:', err);
      callback([]);
    }
  });

  // Disconnect handler
  socket.on('disconnect', async () => {
    const username = onlineUsers.get(socket.id);
    onlineUsers.delete(socket.id);

    if (username) {
      const user = await User.findOne({ username })
        .populate({
          path: 'friends',
          populate: [{ path: 'requester' }, { path: 'recipient' }]
        });

      if (user?.friends) {
        user.friends.forEach(friend => {
          if (friend.status === 'accepted') {
            const otherUser = friend.requester.username === username 
              ? friend.recipient.username 
              : friend.requester.username;
            io.to(otherUser).emit('friend-offline', username);
          }
        });
      }
    }
  });
});

// ======================
// Message Endpoints
// ======================
app.get('/api/messages', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const withUser = req.query.with;

    const messages = await Message.find({
      $or: [
        { username: decoded.username, to: withUser },
        { username: withUser, to: decoded.username }
      ],
      isPrivate: true
    }).sort({ timestamp: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load messages' });
  }
});
