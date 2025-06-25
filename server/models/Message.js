const mongoose = require('mongoose'); // Add this line at the top

const messageSchema = new mongoose.Schema({
  text: { type: String, required: true },
  username: { type: String, required: true },
  to: { type: String },
  isPrivate: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', messageSchema);
