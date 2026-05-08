const mongoose = require('mongoose');
const generateId = require('../utils/generateId');

const valueSchema = new mongoose.Schema({
  _id: { type: String, default: generateId },
  id: { type: String, required: true }, // discord id (user, channel, server)
  key: { type: String, required: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true }
}, { _id: false });

const variableSchema = new mongoose.Schema({
  _id: { type: String, default: generateId },
  name: { type: String, required: true, unique: true },
  values: [valueSchema]
}, { timestamps: true });

module.exports = mongoose.model('Variable', variableSchema);