// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  // Add this field
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Friend' // Reference the Friend model
  }]
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
