// models/VerificationToken.js
const mongoose = require('mongoose');

const VerificationTokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  token: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 3600 } // expires in 1 hour
});

module.exports = mongoose.model('VerificationToken', VerificationTokenSchema);
