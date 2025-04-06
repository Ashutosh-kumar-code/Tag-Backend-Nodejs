const mongoose = require('mongoose');
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    image: { type: String },
    password: { type: String, required: true },
    role: { type: String, enum: ['brand', 'creator'], required: true },
    companyName: { type: String, required: function() { return this.role === 'brand'; } },
    website: { type: String, required: function() { return this.role === 'brand'; } },
    bio: { type: String,  },
    topic: { type: String, required: true },
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);