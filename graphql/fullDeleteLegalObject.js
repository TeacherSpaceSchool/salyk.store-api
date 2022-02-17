const LegalObject = require('../models/legalObject');
const IntegrationObject = require('../models/integrationObject');
const Integration = require('../models/integration');
const CategoryLegalObject = require('../models/categoryLegalObject');
const WorkShift = require('../models/workshift');
const Sale = require('../models/sale');
const WithdrawHistory = require('../models/withdrawHistory');
const DepositHistory = require('../models/depositHistory');
const Client = require('../models/client');
const Consignation = require('../models/consignation');
const Prepayment = require('../models/prepayment');
const Branch = require('../models/branch');
const Item = require('../models/item');
const Report = require('../models/report');
const Cashbox = require('../models/cashbox');
const Review = require('../models/review');
const Payment = require('../models/payment');
const User = require('../models/user');
const History = require('../models/history');
const District = require('../models/district');

const {ugnsTypes, pTypes, bTypes, taxpayerTypes} = require('../module/const');
const {registerKkm, registerSalesPoint, registerTaxPayer} = require('../module/kkm');

const mutation = `
    fullDeleteLegalObject(_id: ID!): String
`;

const resolversMutation = {
    fullDeleteLegalObject: async(parent, { _id }, {user}) => {
        if('superadmin'===user.role) {
            let legalObject = await LegalObject.findOne({_id}).lean()
            if (legalObject) {
                await Integration.deleteOne({legalObject: _id})
                await IntegrationObject.deleteMany({legalObject: _id})
                await District.deleteMany({legalObject: _id})
                await History.deleteMany({where: _id})
                await Review.deleteMany({legalObject: _id})
                await Client.deleteMany({legalObject: _id})
                await Consignation.deleteMany({legalObject: _id})
                await Prepayment.deleteMany({legalObject: _id})
                await Payment.deleteMany({legalObject: _id})
                await WorkShift.deleteMany({legalObject: _id})
                await Sale.deleteMany({legalObject: _id})
                await WithdrawHistory.deleteMany({legalObject: _id})
                await DepositHistory.deleteMany({legalObject: _id})
                await Item.deleteMany({legalObject: _id})
                await Report.deleteMany({legalObject: _id})
                await User.deleteMany({legalObject: _id})

                let sync
                let cashboxes = await Cashbox.find({legalObject: _id}).lean(), uniqueId
                for (let i = 0; i < cashboxes.length; i++) {
                    uniqueId = (await Branch.findById(cashboxes[i].branch).select('uniqueId').lean()).uniqueId
                    if (uniqueId) {
                        sync = await registerKkm({
                            spId: uniqueId,
                            name: cashboxes[i].name,
                            number: cashboxes[i]._id.toString(),
                            regType: '3',
                            rnmNumber: cashboxes[i].rnmNumber
                        })
                        if (!sync.sync)
                            return 'Error cashboxes'
                    }
                }
                await Cashbox.deleteMany({legalObject: _id})
                let branchs = await Branch.find({legalObject: _id}).lean()
                for (let i = 0; i < cashboxes.length; i++) {
                    uniqueId = (await Branch.findById(cashboxes[i].branch).select('uniqueId').lean()).uniqueId
                    if (uniqueId) {
                        let sync = await registerSalesPoint({
                            tpInn: legalObject.inn,
                            name: branchs[i].name,
                            pType: branchs[i].pType === 'Прочее' ? '9999' : pTypes.indexOf(branchs[i].pType),
                            bType: branchs[i].bType === 'Прочее' ? '9999' : bTypes.indexOf(branchs[i].bType),
                            ugns: ugnsTypes[branchs[i].ugns],
                            factAddress: branchs[i].address,
                            xCoordinate: branchs[i].geo ? branchs[i].geo[0] : null,
                            yCoordinate: branchs[i].geo ? branchs[i].geo[1] : null,
                            regType: '3',
                            uniqueId: branchs[i].uniqueId
                        })
                        if (!sync.sync)
                            return 'Error branchs'
                    }
                }
                await Branch.deleteMany({legalObject: _id})

                sync = await registerTaxPayer({
                    tpType: taxpayerTypes[legalObject.taxpayerType],
                    inn: legalObject.inn,
                    name: legalObject.name,
                    ugns: ugnsTypes[legalObject.ugns],
                    legalAddress: legalObject.address,
                    responsiblePerson: legalObject.responsiblePerson,
                    regType: '3'
                })
                if (!sync.sync)
                    return 'Error legalObject'
                await LegalObject.deleteMany({_id})
                await CategoryLegalObject.deleteMany({legalObject: _id})
                return 'OK'
            }
        }
        return 'ERROR'
    }
};

module.exports.resolversMutation = resolversMutation;
module.exports.mutation = mutation;