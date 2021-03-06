const FullDeleteLegalObject = require('../models/fullDeleteLegalObject');
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

const type = `
  type FullDeleteLegalObject {
    _id: ID
    createdAt: Date
    legalObject: String
    status: String
    end: Date
  }
`;

const query = `
    fullDeleteLegalObjects(skip: Int): [FullDeleteLegalObject]
`;

const mutation = `
    fullDeleteLegalObject(_id: ID!): String
`;

const resolvers = {
    fullDeleteLegalObjects: async(parent, {skip}, {user}) => {
        if('superadmin'===user.role) {
            return await FullDeleteLegalObject.find()
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 15 : 10000000000)
                .sort('-createdAt')
                .lean()
        }
    }
};

const resolversMutation = {
    fullDeleteLegalObject: async(parent, { _id }, {user}) => {
        if('superadmin'===user.role) {
            let legalObject = await LegalObject.findOne({_id}).lean()
            if(await WorkShift.findOne({legalObject: _id, end: null}).select('_id').lean())
                return '???????????????? ??????????'
            if (legalObject) {
                let fullDeleteLegalObject = new FullDeleteLegalObject({
                    legalObject: legalObject.name,
                    status: '??????????????????'
                });
                fullDeleteLegalObject = await FullDeleteLegalObject.create(fullDeleteLegalObject)
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
                    if (uniqueId&&cashboxes[i].rnmNumber) {
                        sync = await registerKkm({
                            spId: uniqueId,
                            name: cashboxes[i].name,
                            number: cashboxes[i]._id.toString(),
                            regType: '3',
                            rnmNumber: cashboxes[i].rnmNumber
                        })
                        if (!sync.sync) {
                            fullDeleteLegalObject.status = '???????????? cashboxes'
                            fullDeleteLegalObject.end = new Date()
                            await fullDeleteLegalObject.save()
                            return '???????????? cashboxes'
                        }
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
                            pType: branchs[i].pType === '????????????' ? '9999' : pTypes.indexOf(branchs[i].pType),
                            bType: branchs[i].bType === '????????????' ? '9999' : bTypes.indexOf(branchs[i].bType),
                            ugns: ugnsTypes[branchs[i].ugns],
                            factAddress: branchs[i].address,
                            xCoordinate: branchs[i].geo ? branchs[i].geo[0] : null,
                            yCoordinate: branchs[i].geo ? branchs[i].geo[1] : null,
                            regType: '3',
                            uniqueId: branchs[i].uniqueId
                        })
                        if (!sync.sync) {
                            fullDeleteLegalObject.status = '???????????? branchs'
                            fullDeleteLegalObject.end = new Date()
                            await fullDeleteLegalObject.save()
                            return '???????????? '
                        }
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
                if (!sync.sync) {
                    fullDeleteLegalObject.status = '???????????? legalObject'
                    fullDeleteLegalObject.end = new Date()
                    await fullDeleteLegalObject.save()
                    return '???????????? legalObject'
                }
                await LegalObject.deleteMany({_id})
                await CategoryLegalObject.deleteMany({legalObject: _id})
                fullDeleteLegalObject.status = '???????????? ?????????????? ??????????????'
                fullDeleteLegalObject.end = new Date()
                await fullDeleteLegalObject.save()
                return '???????????? ?????????????? ??????????????'
            }
        }
        return '????????????'
    }
};

module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;
module.exports.resolversMutation = resolversMutation;
module.exports.mutation = mutation;