const mongoose = require('mongoose');
const generateId = require('../utils/generateId');

const tankSchema = new mongoose.Schema({
  _id: { type: String, default: generateId },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String, required: true },
  capacity: { type: Number, required: true },   // Note: spelled "capacity"
  desc: { type: String, default: '' }
});

module.exports = mongoose.model('Tank', tankSchema);
