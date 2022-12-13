const mongoose = require('mongoose');

const ShortLinkSchema = mongoose.Schema({
    link: String,
}, {
    timestamps: true
});

const ShortLink = mongoose.model('ShortLinkSALYK', ShortLinkSchema);

module.exports = ShortLink;