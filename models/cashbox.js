const mongoose = require('mongoose');

const CashboxSchema = mongoose.Schema({
    name: String,
    legalObject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LegalObjectSALYK'
    },
    branch: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BranchSALYK'
    },
    presentCashier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserSALYK'
    },
    cash: {
        type: Number,
        default: 0
    },
    endPayment: Date,
    fnExpiresAt: Date,
    fn: String,
    del: Boolean,
    syncType: String,
    sync: Boolean,
    syncMsg: String,
    syncData: {
        type: [[String]],
        default: []
    },
    rnmNumber: String,
    registrationNumber: String
}, {
    timestamps: true
});

CashboxSchema.index({legalObject: 1})
CashboxSchema.index({presentCashier: 1})
CashboxSchema.index({branch: 1})
CashboxSchema.index({name: 1})
CashboxSchema.index({del: 1})

const Cashbox = mongoose.model('CashboxSALYK', CashboxSchema);

module.exports = Cashbox;