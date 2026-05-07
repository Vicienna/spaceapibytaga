const express = require('express');
const router = express.Router();
const Planet = require('../models/Planet');

router.get('/', async (req, res) => {
  const planets = await Planet.find();
  res.json(planets);
});

router.get('/:id', async (req, res) => {
  const planet = await Planet.findById(req.params.id);
  if (!planet) return res.status(404).json({ error: 'Planet not found' });
  res.json(planet);
});

router.post('/', async (req, res) => {
  const { name, image, distance, asteroidLevel, desc } = req.body;
  const newPlanet = new Planet({ name, image, distance, asteroidLevel, desc });
  await newPlanet.save();
  res.status(201).json(newPlanet);
});

router.put('/:id', async (req, res) => {
  const updated = await Planet.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: true }
  );
  if (!updated) return res.status(404).json({ error: 'Planet not found' });
  res.json(updated);
});

router.delete('/:id', async (req, res) => {
  const removed = await Planet.findByIdAndDelete(req.params.id);
  if (!removed) return res.status(404).json({ error: 'Planet not found' });
  res.json({ message: 'Planet deleted', id: req.params.id });
});

module.exports = router;
