const express = require('express');
const Requirement = require('../models/Requirement');
const router = express.Router();

// Post a requirement
router.post('/post', async (req, res) => {
    try {
        const { brandId, title, description, category, budget, totalNeed } = req.body;
        const newRequirement = new Requirement({ brandId, title, description, category, budget, totalNeed });
        await newRequirement.save();
        res.status(201).json({ message: 'Requirement posted successfully', requirement: newRequirement });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all requirements
// Get all requirements with optional filtering by category
router.get('/list', async (req, res) => {
    try {
        const { category } = req.query;
        const filter = category ? { category } : {};
        const requirements = await Requirement.find(filter).populate('brandId', 'companyName website');
        res.json(requirements);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Filter requirements by category
// router.get('/filter', async (req, res) => {
//     try {
//         const { category } = req.query;
//         const filteredRequirements = await Requirement.find({ category }).populate('brandId', 'companyName website');
//         res.json(filteredRequirements);
//     } catch (error) {
//         res.status(500).json({ message: 'Server error' });
//     }
// });

module.exports = router;