const mongoose = require('mongoose');

const DomainSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  weight: {
    type: Number,
    required: true
  }
});

const CertificationSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    auto: true
  },
  name: {
    type: String,
    required: true
  },
  code: {
    type: String,
    required: true,
    unique: true
  },
  provider: {
    type: String,
    required: true,
    enum: ['AWS', 'Terraform', 'Kubernetes']
  },
  description: {
    type: String
  },
  passingScore: {
    type: Number,
    required: true
  },
  timeLimit: {
    type: Number,
    required: true
  },
  domains: [DomainSchema],
  active: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Certification', CertificationSchema);