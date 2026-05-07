const mongoose = require('mongoose');
const generateId = require('../utils/generateId');

const thrusterSchema = new mongoose.Schema({
  _id: { type: String, default: generateId },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String, required: true },       // URL
  speedLevel: { type: Number, required: true },
  desc: { type: String, default: '' },
  fuelUsage: { type: Number, required: true }    // Fuel usage per second, etc.
});

module.exports = mongoose.model('Thruster', thrusterSchema);
