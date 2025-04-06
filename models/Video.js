const mongoose = require('mongoose');

const VideoSchema = new mongoose.Schema({
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    title: { type: String, required: true },
    description: { type: String, required: true },
    videoUrl: { type: String, required: true },
    thumbnailUrl: { type: String, },
    category: { type: String, required: true },
    type: { type: String, enum: ['video', 'short'], required: true },
    views: { type: Number, default: 0 }, // 👈 Added views field
}, { timestamps: true });

module.exports = mongoose.model('Video', VideoSchema);
