const mongoose = require('mongoose');

const ContactSchema = mongoose.Schema({
    name: String,
    addresses: mongoose.Schema.Types.Mixed,
    email: [String],
    phone: [String],
    info: String,
    social: mongoose.Schema.Types.Mixed,
    whatsapp: [Boolean],
    connectionApplicationPhone: String
}, {
    timestamps: true
});


const Contact = mongoose.model('ContactSALYK', ContactSchema);

module.exports = Contact;