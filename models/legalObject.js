const mongoose = require('mongoose');

const LegalObjectSchema = mongoose.Schema({
    name: String,
    inn: {
        type: String,
        required: true,
        unique: true
    },
    address: String,
    phone: [String],
    status: String,
    email: [String],
    responsiblePerson: String,
    del: Boolean,
    payment: Boolean,
    sync: Boolean,
    syncMsg: String,
    accessLogin: String,
    accessPassword: String,
    accessToken: String,
    accessTokenTTL: Date,
    refreshToken: String,
    refreshTokenTTL: Date,
    ofd: {
        type: Boolean,
        default: true
    },
    agent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserSALYK'
    },
    //v2
    taxSystem_v2: Number,
    ndsType_v2: Number,
    nspType_v2: Number,
    ugns_v2: Number,
    vatPayer_v2: Boolean,
    taxpayerType_v2: String,
    //old
    regType: String,
    rateTaxe: String,
    ndsType: String,
    nspType: String,
    taxpayerType: String,
    ugns: String,
}, {
    timestamps: true
});

LegalObjectSchema.index({name: 1})
LegalObjectSchema.index({del: 1})
LegalObjectSchema.index({ofd: 1})
LegalObjectSchema.index({inn: 1})
LegalObjectSchema.index({agent: 1})

const LegalObject = mongoose.model('LegalObjectSALYK', LegalObjectSchema);

module.exports = LegalObject;