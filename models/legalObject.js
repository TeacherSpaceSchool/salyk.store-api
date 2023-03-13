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
    ofd: {
        type: Boolean,
        default: true
    },
    agent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserSALYK'
    },
    //v2
    taxSystemName_v2: String,
    taxSystemCode_v2: Number,
    ndsTypeCode_v2: Number,
    ndsTypeRate_v2: Number,
    nspTypeCode_v2: Number,
    nspTypeRate_v2: Number,
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