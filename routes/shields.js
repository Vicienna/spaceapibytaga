const express = require('express');
const router = express.Router();
const Shield = require('../models/Shield');

router.get('/', async (req, res) => {
  const shields = await Shield.find();
  res.json(shields);
});

router.get('/:id', async (req, res) => {
  const shield = await Shield.findById(req.params.id);
  if (!shield) return res.status(404).json({ error: 'Shield not found' });
  res.json(shield);
});

router.post('/', async (req, res) => {
  const { name, price, image, resilience, desc } = req.body;
  const newShield = new Shield({ name, price, image, resilience, desc });
  await newShield.save();
  res.status(201).json(newShield);
});

router.put('/:id', async (req, res) => {
  const updated = await Shield.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: true }
  );
  if (!updated) return res.status(404).json({ error: 'Shield not found' });
  res.json(updated);
});

router.delete('/:id', async (req, res) => {
  const removed = await Shield.findByIdAndDelete(req.params.id);
  if (!removed) return res.status(404).json({ error: 'Shield not found' });
  res.json({ message: 'Shield deleted', id: req.params.id });
});

module.exports = router;
