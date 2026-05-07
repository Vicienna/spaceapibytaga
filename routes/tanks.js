const express = require('express');
const router = express.Router();
const Tank = require('../models/Tank');

router.get('/', async (req, res) => {
  const tanks = await Tank.find();
  res.json(tanks);
});

router.get('/:id', async (req, res) => {
  const tank = await Tank.findById(req.params.id);
  if (!tank) return res.status(404).json({ error: 'Tank not found' });
  res.json(tank);
});

router.post('/', async (req, res) => {
  const { name, price, image, capacity, desc } = req.body;
  const newTank = new Tank({ name, price, image, capacity, desc });
  await newTank.save();
  res.status(201).json(newTank);
});

router.put('/:id', async (req, res) => {
  const updated = await Tank.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: true }
  );
  if (!updated) return res.status(404).json({ error: 'Tank not found' });
  res.json(updated);
});

router.delete('/:id', async (req, res) => {
  const removed = await Tank.findByIdAndDelete(req.params.id);
  if (!removed) return res.status(404).json({ error: 'Tank not found' });
  res.json({ message: 'Tank deleted', id: req.params.id });
});

module.exports = router;
