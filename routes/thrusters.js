const express = require('express');
const router = express.Router();
const Thruster = require('../models/Thruster');

// GET all thrusters
router.get('/', async (req, res) => {
  try {
    const thrusters = await Thruster.find();
    res.json(thrusters);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single thruster by custom ID
router.get('/:id', async (req, res) => {
  try {
    const thruster = await Thruster.findById(req.params.id);
    if (!thruster) return res.status(404).json({ error: 'Thruster not found' });
    res.json(thruster);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST add new thruster
router.post('/', async (req, res) => {
  try {
    const { name, price, image, speedLevel, desc, fuelUsage } = req.body;
    const newThruster = new Thruster({ name, price, image, speedLevel, desc, fuelUsage });
    await newThruster.save();
    res.status(201).json(newThruster);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT update thruster
router.put('/:id', async (req, res) => {
  try {
    const updated = await Thruster.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ error: 'Thruster not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE thruster
router.delete('/:id', async (req, res) => {
  try {
    const removed = await Thruster.findByIdAndDelete(req.params.id);
    if (!removed) return res.status(404).json({ error: 'Thruster not found' });
    res.json({ message: 'Thruster deleted', id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
