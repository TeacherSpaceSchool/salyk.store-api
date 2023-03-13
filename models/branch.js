const mongoose = require('mongoose');

const BranchSchema = mongoose.Schema({
    legalObject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LegalObjectSALYK'
    },

    businessActivityCode_v2: Number,
    businessActivityName_v2: String,
    entrepreneurshipObjectCode_v2: Number,
    entrepreneurshipObjectName_v2: String,
    ugnsCode_v2: Number,
    ugnsName_v2: String,
    calcItemAttributeCode_v2: Number,
    calcItemAttributeName_v2: String,
    administrativeArea_v2: String,

    bType: String,
    pType: String,
    ugns: String,

    name: String,
    address: String,
    locality: String,
    postalCode: String,
    route: String,
    streetNumber: String,
    status: String,
    geo: [Number],
    uniqueId: String,
    sync: Boolean,
    syncMsg: String,
    del: Boolean
}, {
    timestamps: true
});

BranchSchema.index({legalObject: 1})
BranchSchema.index({createdAt: 1})
BranchSchema.index({name: 1})
BranchSchema.index({del: 1})
BranchSchema.index({sync: 1})

const Branch = mongoose.model('BranchSALYK', BranchSchema);

module.exports = Branch;