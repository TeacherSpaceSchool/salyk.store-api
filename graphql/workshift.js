const WorkShift = require('../models/workshift');
const Cashbox = require('../models/cashbox');
const LegalObject = require('../models/legalObject');
const DepositHistory = require('../models/depositHistory');
const WithdrawHistory = require('../models/withdrawHistory');
const Report = require('../models/report');
const District = require('../models/district');
const {checkFloat, pdKKM, cashierMaxDay} = require('../module/const');
const {openShift} = require('../module/kkm');
const {openShift2} = require('../module/kkm-2.0');

const type = `
  type WorkShift {
    _id: ID
    number: String
    createdAt: Date
    legalObject: LegalObject
    branch: Branch
    cashier: User
    cashbox: Cashbox
    sale: Float
    consignation: Float
    paidConsignation: Float
    prepayment: Float
    returned: Float
    cashless: Float
    cash: Float
    cashEnd: Float
    deposit: Float
    withdraw: Float
    discount: Float
    extra: Float
    start: Date
    end: Date
    consignationCount: Int
    saleCount: Int
    paidConsignationCount: Int
    prepaymentCount: Int
    returnedCount: Int
    buy: Float
    buyCount: Int
    returnedBuy: Float
    returnedBuyCount: Int
    sync: Boolean
    expired: Boolean
    syncMsg: String
    syncData: String
  }
`;

const query = `
    workShifts(skip: Int, legalObject: ID, branch: ID, cashier: ID, cashbox: ID, filter: String, date: Date): [WorkShift]
    workShiftsCount(legalObject: ID, branch: ID, cashier: ID, cashbox: ID, filter: String, date: Date): Int
    workShift(_id: ID!): WorkShift
`;

const mutation = `
    startWorkShift(cashbox: ID!): WorkShift
    setWorkShift(_id: ID, deposit: Float, withdraw: Float, comment: String): String
    endWorkShift(_id: ID): ID
`;

const resolvers = {
    workShifts: async(parent, {skip, legalObject, cashbox, branch, cashier, filter, date}, {user}) => {
        if(['admin', 'superadmin', 'управляющий', 'кассир', 'супервайзер'].includes(user.role)) {
            if(user.legalObject) legalObject = user.legalObject
            let districts = [], workShiftsCashier = []
            if(user.role==='супервайзер'){
                districts = await District.find({
                    supervisors: user._id,
                })
                    .distinct('branchs')
                    .lean()
            }
            else if(user.role==='кассир'){
                let dateStartCashier = new Date()
                dateStartCashier.setDate(dateStartCashier.getDate() - cashierMaxDay)
                workShiftsCashier = await WorkShift
                    .findOne({
                        legalObject: user.legalObject,
                        branch: user.branch,
                        cashier: user._id,
                        createdAt: {$gte: dateStartCashier}
                    })
                    .distinct('_id')
                    .lean()
            }
            let dateStart, dateEnd;
            if (date&&date!=='') {
                dateStart = new Date(date)
                dateStart.setHours(0, 0, 0, 0)
                dateEnd = new Date(dateStart)
                dateEnd.setDate(dateEnd.getDate() + 1)
            }
            let res =  await WorkShift.find({
                ...dateStart||'супервайзер'===user.role||branch?{
                    $and: [
                        ...dateStart?[{createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}}]:[],
                        ...user.role==='супервайзер'?[{branch: {$in: districts}}]:[],
                        ...branch?[{branch}]:[]
                    ]
                }:{},
                ...legalObject ? {legalObject} : {},
                ...cashbox ? {cashbox} : {},
                ...cashier?{cashier}:{},
                ...user.role==='кассир'?{_id: {$in: workShiftsCashier}}:{},
                ...filter&&filter==='active'?{end: null}:{},
             })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 30 : 10000000000)
                .sort('-createdAt')
                .sort('-end')
                .populate({
                    path: 'cashier',
                    select: 'name _id role'
                })
                .populate({
                    path: 'cashbox',
                    select: 'name _id'
                })
                .populate({
                    path: 'legalObject',
                    select: 'name _id'
                })
                .populate({
                    path: 'branch',
                    select: 'name _id'
                })
                .lean()
            const now = new Date()
            for(let i=0; i<res.length; i++) {
                if(!res[i].end){
                    res[i].expired = ((now-res[i].start)/1000/60/60)>24
                }
            }
            return res
        }
    },
    workShiftsCount: async(parent, {legalObject, branch, cashier, filter, date, cashbox}, {user}) => {
        if(['admin', 'superadmin', 'управляющий', 'кассир', 'супервайзер'].includes(user.role)) {
            if(user.legalObject) legalObject = user.legalObject
            let districts = [], workShiftsCashier = []
            if(user.role==='супервайзер'){
                districts = await District.find({
                    supervisors: user._id,
                })
                    .distinct('branchs')
                    .lean()
            }
            else if(user.role==='кассир'){
                let dateStartCashier = new Date()
                dateStartCashier.setDate(dateStartCashier.getDate() - cashierMaxDay)
                workShiftsCashier = await WorkShift
                    .findOne({
                        legalObject: user.legalObject,
                        branch: user.branch,
                        cashier: user._id,
                        createdAt: {$gte: dateStartCashier}
                    })
                    .distinct('_id')
                    .lean()
            }
            let dateStart, dateEnd;
            if (date&&date.length) {
                dateStart = new Date(date)
                dateStart.setHours(0, 0, 0, 0)
                dateEnd = new Date(dateStart)
                dateEnd.setDate(dateEnd.getDate() + 1)
            }
            let res = await WorkShift.countDocuments({
                ...dateStart||'супервайзер'===user.role||branch?{
                    $and: [
                        ...dateStart?[{createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}}]:[],
                        ...user.role==='супервайзер'?[{branch: {$in: districts}}]:[],
                        ...branch?[{branch}]:[]
                    ]
                }:{},
                ...cashbox ? {cashbox} : {},
                ...legalObject ? {legalObject} : {},
                ...cashier ? {cashier} : {},
                ...user.role==='кассир'?{_id: {$in: workShiftsCashier}}:{},
                ...filter&&filter==='active'||!dateStart?{end: null}:{},
            })
                .lean()
            return res
        }
    },
    workShift: async(parent, {_id}, {user}) => {
        if(['admin', 'superadmin', 'управляющий', 'кассир', 'супервайзер'].includes(user.role)) {
            let districts = [], workShiftsCashier = []
            if(user.role==='супервайзер'){
                districts = await District.find({
                    supervisors: user._id,
                })
                    .distinct('branchs')
                    .lean()
            }
            else if(user.role==='кассир'){
                let dateStartCashier = new Date()
                dateStartCashier.setDate(dateStartCashier.getDate() - cashierMaxDay)
                workShiftsCashier = await WorkShift
                    .findOne({
                        legalObject: user.legalObject,
                        branch: user.branch,
                        cashier: user._id,
                        createdAt: {$gte: dateStartCashier}
                    })
                    .distinct('_id')
                    .lean()
            }
            let res = await WorkShift.findOne({
                ...user.role==='кассир'? {$and: [{_id: {$in: workShiftsCashier}}, {_id}]}:{_id},
                ...user.legalObject?{legalObject: user.legalObject}:{},
                ...user.role==='супервайзер'?{branch: {$in: districts}}:{},
            })
                .populate({
                    path: 'cashier',
                    select: 'name _id role'
                })
                .populate({
                    path: 'cashbox',
                    select: '_id name rnmNumber fn registrationNumber'
                })
                .populate({
                    path: 'legalObject',
                    select: '_id name inn rateTaxe taxSystemName_v2'
                })
                .populate({
                    path: 'branch',
                    select: '_id name address'
                })
                .lean()
            if(!res.end){
                res.expired = ((new Date()-res.start)/1000/60/60)>24
            }
            return res
        }
    },
};

const endWorkShift = async ({_id, user}) => {
    if(['кассир', 'управляющий', 'superadmin', 'супервайзер', 'admin'].includes(user.role)) {
        let workShift = await WorkShift.findOne({
            ...user.role === 'кассир' ? {cashier: user._id} : {_id},
            ...user.legalObject?{legalObject: user.legalObject}:{},
            ...user.branch?{branch: user.branch}:{},
            end: null
        })
        let cashbox = await Cashbox.findOne({_id: workShift.cashbox})
        if (workShift && cashbox) {
            workShift.end = new Date()
            cashbox.presentCashier = null
            await cashbox.save()
            await workShift.save();
            let number = (await Report.countDocuments({cashbox: cashbox._id, type: 'Z'}).lean()) + 1;
            let report = new Report({
                number,
                legalObject: cashbox.legalObject,
                branch: workShift.branch,
                cashbox: cashbox._id,
                workShift: workShift._id,
                type: 'Z',
                cashEnd: cashbox.cash,
                deposit: workShift.deposit,
                withdraw: workShift.withdraw,
                discount: workShift.discount,
                extra: workShift.extra,
                cash: workShift.cash,
                cashless: workShift.cashless,
                sale: workShift.sale,
                saleCount: workShift.saleCount,
                consignation: workShift.consignation,
                consignationCount: workShift.consignationCount,
                paidConsignation: workShift.paidConsignation,
                paidConsignationCount: workShift.paidConsignationCount,
                prepayment: workShift.prepayment,
                prepaymentCount: workShift.prepaymentCount,
                returned: workShift.returned,
                returnedCount: workShift.returnedCount,
                buy: workShift.buy,
                buyCount: workShift.buyCount,
                returnedBuy: workShift.returnedBuy,
                returnedBuyCount: workShift.returnedBuyCount,
                start: workShift.start,
                sync: workShift.sync
            });

            report.end = new Date()
            if (((report.end - report.start) / 1000 / 60 / 60) > 24) {
                report.end = new Date(report.start)
                report.end.setHours(report.end.getHours() + 24)
            }

            report = await Report.create(report)
            if (workShift.syncMsg!=='Фискальный режим отключен') {
                if (report.sync) {
                    if(cashbox.fn) {
                        const {closeShift2} = require('../module/kkm-2.0');
                        closeShift2(cashbox.fn, cashbox.legalObject, report._id)
                    }
                    else {
                        const {zReport} = require('../module/kkm');
                        zReport(report._id)
                    }
                }
                else
                    await Report.updateOne({_id: report._id}, {sync: false, syncMsg: 'Смена не синхронизирована'})
            } else
                await Report.updateOne({_id: report._id}, {sync: true, syncMsg: 'Фискальный режим отключен'})

            return report._id
        }
    }
}

const setWorkShift = async ({_id, deposit, withdraw, comment, user}) => {
    if(['admin', 'superadmin', 'управляющий', 'кассир', 'супервайзер'].includes(user.role)) {
        let workShift = await WorkShift.findOne({
            ...user.role==='кассир'? {cashier: user._id}:{_id},
            ...user.legalObject?{legalObject: user.legalObject}:{},
            ...user.branch?{branch: user.branch}:{},
            end: null
        })
        let cashbox = await Cashbox.findOne({_id: workShift.cashbox})
        if(workShift&&cashbox) {
            if(deposit) {
                let number = (await DepositHistory.countDocuments({cashbox: cashbox._id}).lean())+1;
                let depositHistory = new DepositHistory({
                    number,
                    comment,
                    amount: deposit,
                    legalObject: workShift.legalObject,
                    branch: workShift.branch,
                    cashier: workShift.cashier,
                    workShift: workShift._id,
                    cashbox: cashbox._id,
                    syncMsg: !(await LegalObject.findOne({ofd: true, _id: cashbox.legalObject}).select('ofd').lean())?'Фискальный режим отключен':''
                });
                await DepositHistory.create(depositHistory)
                workShift.deposit = checkFloat(workShift.deposit + deposit)
                workShift.cashEnd = checkFloat(workShift.cashEnd + deposit)
                cashbox.cash = checkFloat(cashbox.cash + deposit)
            }
            if(workShift.cashEnd>=withdraw&&withdraw) {
                let number = (await WithdrawHistory.countDocuments({cashbox: cashbox._id}).lean())+1;
                let withdrawHistory = new WithdrawHistory({
                    number,
                    comment,
                    amount: withdraw,
                    legalObject: workShift.legalObject,
                    branch: workShift.branch,
                    cashier: workShift.cashier,
                    workShift: workShift._id,
                    cashbox: cashbox._id,
                    syncMsg: !(await LegalObject.findOne({ofd: true, _id: cashbox.legalObject}).select('ofd').lean())?'Фискальный режим отключен':''
                });
                await WithdrawHistory.create(withdrawHistory)
                workShift.withdraw = checkFloat(workShift.withdraw + withdraw)
                workShift.cashEnd = checkFloat(workShift.cashEnd - withdraw)
                if(workShift.cashEnd<0)
                    workShift.cashEnd = 0
                cashbox.cash = checkFloat(cashbox.cash - withdraw)
                if(cashbox.cash<0)
                    cashbox.cash = 0
            }
            await cashbox.save()
            await workShift.save();
            return 'OK'
        }
    }
    return 'ERROR'
}

const resolversMutation = {
    startWorkShift: async(parent, {cashbox}, {user}) => {
        if('кассир'===user.role&&user.branch) {
            let start = new Date()
            let workShift = await WorkShift.findOne({legalObject: user.legalObject, cashier: user._id, end: null}).select('_id').lean()
            cashbox = await Cashbox.findOne({
                presentCashier: null,
                _id: cashbox,
                legalObject: user.legalObject,
                branch: user.branch,
                endPayment: {$gte: new Date()},
                $or: [
                    {fnExpiresAt: null},
                    {fnExpiresAt: {$gte: start}}
                ]
            })
            if(cashbox&&!workShift) {
                let number = (await WorkShift.countDocuments({cashbox: cashbox._id}).lean())+1;
                workShift = new WorkShift({
                    number,
                    legalObject: user.legalObject,
                    branch: user.branch,
                    cashier: user._id,
                    cashbox: cashbox._id,
                    consignation: 0,
                    paidConsignation: 0,
                    prepayment: 0,
                    returned: 0,
                    cash: 0,
                    cashless: 0,
                    sale: 0,
                    cashEnd: 0,
                    deposit: 0,
                    extra: 0,
                    withdraw: 0,
                    discount: 0,
                    consignationCount: 0,
                    saleCount: 0,
                    paidConsignationCount: 0,
                    prepaymentCount: 0,
                    returnedCount: 0,
                    buy: 0,
                    buyCount: 0,
                    returnedBuy: 0,
                    returnedBuyCount: 0,
                    start
                });

                if(!(await LegalObject.findOne({ofd: true, _id: user.legalObject}).select('ofd').lean())) {
                    workShift.sync = true
                    workShift.syncMsg = 'Фискальный режим отключен'
                }
                workShift = await WorkShift.create(workShift)
                if(workShift.syncMsg!=='Фискальный режим отключен') {
                    if(cashbox.fn)
                        openShift2(
                            cashbox.fn,
                            cashbox.legalObject,
                            workShift._id
                        )
                    else if(cashbox.rnmNumber)
                        openShift({
                            workShift: workShift._id,
                            rnmNumber: cashbox.rnmNumber,
                            number,
                            date: pdKKM(start)
                        })
                    else
                        await WorkShift.updateOne({_id: workShift._id}, {sync: false, syncMsg: 'Отсутсвуют данные для интеграции'})
                }

                cashbox.presentCashier = user._id
                await cashbox.save()
                return await WorkShift.findOne({
                    _id: workShift._id
                })
                    .populate({
                        path: 'cashier',
                        select: 'name _id role'
                    })
                    .populate({
                        path: 'cashbox',
                        select: 'name _id'
                    })
                    .populate({
                        path: 'legalObject',
                        select: 'name _id'
                    })
                    .populate({
                        path: 'branch',
                        select: 'name _id'
                    })
                    .lean()
            }
        }
    },
    setWorkShift: async(parent, {_id, deposit, withdraw, comment}, {user}) => {
        return await setWorkShift({_id, deposit, withdraw, comment, user})
    },
    endWorkShift: async(parent, {_id}, {user}) => {
        return await endWorkShift({_id, user})
    }
};

module.exports.setWorkShift = setWorkShift;
module.exports.endWorkShift = endWorkShift;
module.exports.resolversMutation = resolversMutation;
module.exports.mutation = mutation;
module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;