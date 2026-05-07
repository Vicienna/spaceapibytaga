const mongoose = require('mongoose');
const generateId = require('../utils/generateId');

const shieldSchema = new mongoose.Schema({
  _id: { type: String, default: generateId },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String, required: true },
  resilience: { type: Number, required: true },
  desc: { type: String, default: '' }
});

module.exports = mongoose.model('Shield', shieldSchema);
