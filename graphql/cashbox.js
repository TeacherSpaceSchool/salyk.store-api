const Cashbox = require('../models/cashbox');
const District = require('../models/district');
const IntegrationObject = require('../models/integrationObject');
const History = require('../models/history');
const {registerCashbox, getCashboxState, deleteCashbox, reregisterCashbox} = require('../module/kkm-2.0');
const randomstring = require('randomstring');

const type = `
  type Cashbox {
    _id: ID
    createdAt: Date
    name: String
    legalObject: LegalObject
    branch: Branch
    presentCashier: User
    cash: Float
    del: Boolean
    endPayment: Date
    sync: Boolean
    syncMsg: String
    rnmNumber: String
    fnExpiresAt: Date
    fn: String
    registrationNumber: String
    syncData: [[String]]
  }
`;

const query = `
    cashboxes(skip: Int, search: String, legalObject: ID, branch: ID, filter: String, all: Boolean, del: Boolean): [Cashbox]
    cashboxesCount(search: String, legalObject: ID, branch: ID, filter: String, del: Boolean): Int
    cashbox(_id: ID!): Cashbox
`;

const mutation = `
    addCashbox(name: String!, fn: String!, legalObject: ID!, branch: ID!): String
    setCashbox(_id: ID!, name: String, branch: ID): String
    clearCashbox(_id: ID!): String
    deleteCashbox(_id: ID!): String
    restoreCashbox(_id: ID!): String
`;

const resolvers = {
    cashboxes: async(parent, {skip, search, legalObject, branch, filter, all, del}, {user}) => {
        if(['admin', 'superadmin', 'управляющий', 'кассир', 'супервайзер'].includes(user.role)||(search&&search.length>2||all)&&user.role==='оператор') {
            if(user.legalObject) legalObject = user.legalObject
            let districts = []
            if(user.role==='супервайзер')
                districts = await District.find({
                    supervisors: user._id,
                })
                    .distinct('branchs')
                    .lean()
            return await Cashbox.find({
                del: del?true:{$ne: true},
                ...filter==='active'?{presentCashier: {$ne: null}}:filter==='deactive'?{presentCashier: null}:{},
                ...search&&search.length?{$or: [
                    {registrationNumber: {'$regex': search, '$options': 'i'}},
                    {rnmNumber: {'$regex': search, '$options': 'i'}},
                    {name: {'$regex': search, '$options': 'i'}},
                    {fn: {'$regex': search, '$options': 'i'}}
                ]}:{},
                ...legalObject ? {legalObject} : {},
                ...'кассир'===user.role&&!all||'супервайзер'===user.role||branch?{
                    $and: [
                        ...user.role==='супервайзер'?[{branch: {$in: districts}}]:[],
                        ...user.role==='кассир'?[{branch: user.branch}]:[],
                        ...branch?[{branch}]:[]
                    ]
                }:{}
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 30 : 10000000000)
                .sort('name')
                .populate({
                    path: 'presentCashier',
                    select: 'name _id role'
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
        return []
    },
    cashboxesCount: async(parent, {search, legalObject, branch, filter, del}, {user}) => {
        if(['admin', 'superadmin', 'управляющий', 'супервайзер'].includes(user.role)||search&&search.length>2&&user.role==='оператор') {
            if(user.legalObject) legalObject = user.legalObject
            let districts = []
            if(user.role==='супервайзер'){
                districts = await District.find({
                    supervisors: user._id,
                })
                    .distinct('branchs')
                    .lean()
            }
            return await Cashbox.countDocuments({
                ...filter==='active'?{presentCashier: {$ne: null}}:filter==='deactive'?{presentCashier: null}:{},
                del: del?true:{$ne: true},
                ...search&&search.length?{$or: [
                    {registrationNumber: {'$regex': search, '$options': 'i'}},
                    {rnmNumber: {'$regex': search, '$options': 'i'}},
                    {name: {'$regex': search, '$options': 'i'}},
                    {fn: {'$regex': search, '$options': 'i'}}
                ]}:{},
                ...legalObject ? {legalObject: legalObject} : {},
                ...['супервайзер', 'кассир'].includes(user.role)||branch?{
                    $and: [
                        ...user.role==='супервайзер'?[{branch: {$in: districts}}]:[],
                        ...user.role==='кассир'?[{branch: user.branch}]:[],
                        ...branch?[{branch}]:[]
                    ]
                }:{}
            })
                .lean()
        }
        return 0
    },
    cashbox: async(parent, {_id}, {user}) => {
        if(['admin', 'superadmin', 'управляющий', 'кассир', 'супервайзер', 'оператор'].includes(user.role)) {
            let districts = []
            if(user.role==='супервайзер'){
                districts = await District.find({
                    supervisors: user._id,
                })
                    .distinct('branchs')
                    .lean()
            }
            let res = await Cashbox.findOne({
                _id,
                ...user.legalObject ? {legalObject: user.legalObject, del: {$ne: true}} : {},
                ...user.role==='супервайзер'?{branch: {$in: districts}}:{},
                ...user.role==='кассир'?{branch: user.branch}:{}
            })
                .populate({
                    path: 'presentCashier',
                    select: 'name _id role'
                })
                .populate({
                    path: 'legalObject',
                    select: 'name _id inn taxSystem_v2 vatPayer_v2'
                })
                .populate({
                    path: 'branch',
                    select: 'name _id bType_v2 pType_v2 ugns_v2 calcItemAttribute address'
                })
                .lean()
            return res
        }
    },
};

const resolversMutation = {
    addCashbox: async(parent, {name, legalObject, branch, fn}, {user}) => {
        if(['admin', 'superadmin', 'оператор'].includes(user.role)&&user.add) {
            let _object = new Cashbox({
                name,
                legalObject,
                branch,
                fn,
                cash: 0
            });

            let sync = await registerCashbox(branch, _object._id, fn)
            _object.syncMsg = sync
            setTimeout(async()=>{
                try {
                    sync = await getCashboxState(fn)
                    if (sync&&sync.fnExpiresAt)
                        await Cashbox.updateOne({_id: _object._id}, {
                            $push: {syncData: ['registerCashbox', JSON.stringify({date: new Date(), fields: {1040: 1, 1077: `0x${(randomstring.generate({length: 14, charset: 'numeric'})).toString(16)}`}})]},
                            sync: true,
                            fnExpiresAt: new Date(sync.fnExpiresAt),
                            registrationNumber: sync.registrationNumber
                        })
                } catch (err) {
                    console.error('setTimeout')
                }
            }, 30000)

            _object = await Cashbox.create(_object)
            let history = new History({
                who: user._id,
                where: _object._id,
                what: 'Создание'
            });
            await History.create(history)
            return _object._id
        }
        return 'ERROR'
    },
    setCashbox: async(parent, {_id, name, branch}, {user}) => {
        if(['admin', 'superadmin', 'управляющий', 'супервайзер', 'оператор'].includes(user.role)&&user.add) {
            let object = await Cashbox.findOne({_id, presentCashier: null})
            if(object) {
                let history = new History({
                    who: user._id,
                    where: object._id,
                    what: ''
                });
                if (name) {
                    history.what = `name:${object.name}→${name};`
                    object.name = name
                }
                if (branch) {
                    history.what = `${history.what} branch:${object.branch}→${branch};`
                    object.branch = branch
                    if(object.sync&&object.fnExpiresAt) {
                        await reregisterCashbox(object)
                    }
                }

                if(!object.sync) {
                    let sync = await registerCashbox(object.branch, object._id, object.fn)
                    object.syncMsg = sync
                }
                if(!object.fnExpiresAt) {
                    setTimeout(async()=>{
                        try {
                            let sync = await getCashboxState(object.fn)
                            if(sync&&sync.fnExpiresAt)
                                await Cashbox.updateOne({_id: object._id}, {
                                    $push: {syncData: ['registerCashbox', JSON.stringify({date: new Date(), fields: {1040: 1, 1077: `0x${(randomstring.generate({length: 14, charset: 'numeric'})).toString(16)}`}})]},
                                    sync: true,
                                    fnExpiresAt: new Date(sync.fnExpiresAt),
                                    registrationNumber: sync.registrationNumber
                                })
                        } catch (err) {
                            console.error('setTimeout')
                        }
                    }, 30000)
                }

                await object.save();
                await History.create(history)
                return 'OK'
            }
        }
        return 'ERROR'
    },
    clearCashbox: async(parent, { _id }, {user}) => {
        if('superadmin'===user.role) {
            await Cashbox.updateOne(
                {
                    _id,
                    presentCashier: null
                },
                {
                    sale: 0,
                    consignation: 0,
                    paidConsignation: 0,
                    prepayment: 0,
                    returned: 0,
                    buy: 0,
                    returnedBuy: 0
                }
            )
            let history = new History({
                who: user._id,
                where: _id,
                what: 'Обнуление'
            });
            await History.create(history)
            return 'OK'
        }
        return 'ERROR'
    },
    deleteCashbox: async(parent, { _id }, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.add) {
            let object = await Cashbox.findOne({_id, presentCashier: null})
            if(object) {
                //delete cashbox
                let sync = await deleteCashbox(object._id, object.fn)
                //delete cashbox
                object.del = true
                if(sync) {
                    await object.save()
                    await IntegrationObject.deleteOne({cashbox: _id})
                    let history = new History({
                        who: user._id,
                        where: _id,
                        what: 'Удаление'
                    });
                    await History.create(history)
                    return 'OK'
                }
                else
                    return 'ERROR'
            }
        }
        return 'ERROR'
    },
    restoreCashbox: async(parent, { _id }, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.add) {
            let object = await Cashbox.findOne({_id})
            object.del = false
            await object.save()
            let history = new History({
                who: user._id,
                where: _id,
                what: 'Восстановление'
            });
            await History.create(history)
            return 'OK'
        }
        return 'ERROR'
    }
};

module.exports.resolversMutation = resolversMutation;
module.exports.mutation = mutation;
module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;