const mongoose = require('mongoose');

const RequirementSchema = new mongoose.Schema({
    brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    budget: { type: Number, required: true },
    totalNeed: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Requirement', RequirementSchema);