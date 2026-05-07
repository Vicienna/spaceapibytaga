const mongoose = require('mongoose');
const generateId = require('../utils/generateId');

const planetSchema = new mongoose.Schema({
  _id: { type: String, default: generateId },
  name: { type: String, required: true },
  image: { type: String, required: true },
  distance: { type: Number, required: true },
  asteroidLevel: { type: Number, required: true },
  desc: { type: String, default: '' }
  // No price field as per your specification
});

module.exports = mongoose.model('Planet', planetSchema);
