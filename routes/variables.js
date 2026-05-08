const express = require('express');
const router = express.Router();
const Variable = require('../models/Variable');

// GET /api/var - Docs/cara pakai
router.get('/', async (req, res) => {
  res.json({
    message: 'API Variabel',
    endpoints: {
      'GET /api/var': 'Dokumentasi ini',
      'POST /api/var': 'Buat variabel baru { name: string }',
      'GET /api/var/:name': 'Lihat semua value variabel',
      'POST /api/var/:name': 'Tambah value { id, key, value }',
      'PUT /api/var/:name': 'Edit value { id, key, value }',
      'DELETE /api/var/:name': 'Hapus variabel',
      'GET /api/var/:name/:id': 'Lihat value per ID',
      'POST /api/var/:name/:id': 'Tambah/Edit value per ID { key, value }',
      'PUT /api/var/:name/:id': 'Edit value per ID { key, value }',
      'DELETE /api/var/:name/:id': 'Hapus value per ID'
    }
  });
});

// POST /api/var - Buat variabel baru
router.post('/', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Nama variabel diperlukan' });
  
  try {
    const existing = await Variable.findOne({ name });
    if (existing) return res.status(400).json({ error: 'Variabel sudah ada' });
    
    const variable = new Variable({ name, values: [] });
    await variable.save();
    res.status(201).json(variable);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/var/:name - Lihat semua value variabel
router.get('/:name', async (req, res) => {
  try {
    const variable = await Variable.findOne({ name: req.params.name });
    if (!variable) return res.status(404).json({ error: 'Variabel tidak ditemukan' });
    res.json(variable);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/var/:name - Tambah value
router.post('/:name', async (req, res) => {
  const { id, key, value } = req.body;
  if (!id || !key || value === undefined) {
    return res.status(400).json({ error: 'id, key, dan value diperlukan' });
  }
  
  try {
    const variable = await Variable.findOne({ name: req.params.name });
    if (!variable) return res.status(404).json({ error: 'Variabel tidak ditemukan' });
    
    variable.values.push({ id, key, value });
    await variable.save();
    res.status(201).json(variable);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/var/:name - Edit value (berdasarkan id)
router.put('/:name', async (req, res) => {
  const { id, key, value } = req.body;
  if (!id || !key || value === undefined) {
    return res.status(400).json({ error: 'id, key, dan value diperlukan' });
  }
  
  try {
    const variable = await Variable.findOne({ name: req.params.name });
    if (!variable) return res.status(404).json({ error: 'Variabel tidak ditemukan' });
    
    const valIndex = variable.values.findIndex(v => v.id === id && v.key === key);
    if (valIndex === -1) return res.status(404).json({ error: 'Value tidak ditemukan' });
    
    variable.values[valIndex].value = value;
    await variable.save();
    res.json(variable);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/var/:name - Hapus variabel
router.delete('/:name', async (req, res) => {
  try {
    const variable = await Variable.findOneAndDelete({ name: req.params.name });
    if (!variable) return res.status(404).json({ error: 'Variabel tidak ditemukan' });
    res.json({ message: 'Variabel dihapus', name: req.params.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/var/:name/:id - Lihat value per ID
router.get('/:name/:id', async (req, res) => {
  try {
    const variable = await Variable.findOne({ name: req.params.name });
    if (!variable) return res.status(404).json({ error: 'Variabel tidak ditemukan' });
    
    const values = variable.values.filter(v => v.id === req.params.id);
    res.json({ name: variable.name, id: req.params.id, values });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/var/:name/:id - Tambah/Edit value per ID
router.post('/:name/:id', async (req, res) => {
  const { key, value } = req.body;
  if (!key || value === undefined) {
    return res.status(400).json({ error: 'key dan value diperlukan' });
  }
  
  try {
    let variable = await Variable.findOne({ name: req.params.name });
    if (!variable) {
      variable = new Variable({ name: req.params.name, values: [] });
    }
    
    const existingIndex = variable.values.findIndex(
      v => v.id === req.params.id && v.key === key
    );
    
    if (existingIndex >= 0) {
      variable.values[existingIndex].value = value;
    } else {
      variable.values.push({ id: req.params.id, key, value });
    }
    
    await variable.save();
    res.json(variable);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/var/:name/:id - Edit value per ID
router.put('/:name/:id', async (req, res) => {
  const { key, value } = req.body;
  if (!key || value === undefined) {
    return res.status(400).json({ error: 'key dan value diperlukan' });
  }
  
  try {
    const variable = await Variable.findOne({ name: req.params.name });
    if (!variable) return res.status(404).json({ error: 'Variabel tidak ditemukan' });
    
    const valIndex = variable.values.findIndex(
      v => v.id === req.params.id && v.key === key
    );
    if (valIndex === -1) return res.status(404).json({ error: 'Value tidak ditemukan' });
    
    variable.values[valIndex].value = value;
    await variable.save();
    res.json(variable);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/var/:name/:id - Hapus value per ID
router.delete('/:name/:id', async (req, res) => {
  try {
    const variable = await Variable.findOne({ name: req.params.name });
    if (!variable) return res.status(404).json({ error: 'Variabel tidak ditemukan' });
    
    variable.values = variable.values.filter(v => v.id !== req.params.id);
    await variable.save();
    res.json({ message: 'Value dihapus', id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;