const mongoose = require('mongoose');

const friendSchema = new mongoose.Schema({
  requester: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  recipient: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'rejected'], 
    default: 'pending' 
  }
}, { timestamps: true });

// ✅ Fix: Use existing model if already compiled
module.exports = mongoose.models.Friend || mongoose.model('Friend', friendSchema);
