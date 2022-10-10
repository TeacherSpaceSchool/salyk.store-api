const Branch = require('../models/branch');
const District = require('../models/district');
const IntegrationObject = require('../models/integrationObject');
const History = require('../models/history');
const Cashbox = require('../models/cashbox');
const WorkShift = require('../models/workshift');
const {reregisterCashbox} = require('../module/kkm-2.0');

const type = `
  type Branch {
    _id: ID
    createdAt: Date
    legalObject: LegalObject
    
    bType_v2: Int
    pType_v2: Int
    ugns_v2: Int
    calcItemAttribute: Int
    
    bType: String
    pType: String
    ugns: String
    
    name: String
    address: String
    geo: [Float]
    del: Boolean
    sync: Boolean
    syncMsg: String
    uniqueId: String
    locality: String
    postalCode: String
    route: String
    streetNumber: String
  }
`;

const query = `
    branchs(skip: Int, search: String, legalObject: ID): [Branch]
    branchsCount(search: String, legalObject: ID): Int
    branchsTrash(skip: Int, search: String): [Branch]
    branch(_id: ID!): Branch
`;

const mutation = `
    addBranch(legalObject: ID!, calcItemAttribute: Int!, locality: String!, postalCode: String!, route: String!, streetNumber: String!, address: String!, bType_v2: Int!, pType_v2: Int!, ugns_v2: Int!, name: String!, geo: [Float]): String
    setBranch(_id: ID!, bType_v2: Int, pType_v2: Int, calcItemAttribute: Int, ugns_v2: Int, name: String, address: String, locality: String, postalCode: String, route: String, streetNumber: String, geo: [Float]): String
    deleteBranch(_id: ID!): String
    restoreBranch(_id: ID!): String
`;

const resolvers = {
    branchs: async(parent, {skip, search, legalObject}, {user}) => {
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
            return await Branch.find({
                ...user.role==='супервайзер'?{_id: {$in: districts}}:{},
                ...search&&search.length?{name: {'$regex': search, '$options': 'i'}}:{},
                ...legalObject?{legalObject}:{},
                del: {$ne: true},
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 30 : 10000000000)
                .sort('name')
                .populate({
                    path: 'legalObject',
                    select: 'name _id'
                })
                .lean()
        }
        return []
    },
    branchsCount: async(parent, {search, legalObject}, {user}) => {
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
            return await Branch.countDocuments({
                ...user.role==='супервайзер'?{_id: {$in: districts}}:{},
                ...search&&search.length?{name: {'$regex': search, '$options': 'i'}}:{},
                ...legalObject?{legalObject}:{},
                del: {$ne: true},
            })
                .lean()
        }
        return 0
    },
    branchsTrash: async(parent, {skip, search}, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)) {
            return await Branch.find({
                ...search&&search.length?{name: {'$regex': search, '$options': 'i'}}:{},
                del: true
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 30 : 10000000000)
                .sort('name')
                .populate({
                    path: 'legalObject',
                    select: 'name _id'
                })
                .lean()
        }
    },
    branch: async(parent, {_id}, {user}) => {
        if(['admin', 'superadmin', 'управляющий', 'супервайзер', 'оператор'].includes(user.role)) {
            let districts = []
            if(user.role==='супервайзер'){
                districts = await District.find({
                    supervisors: user._id,
                })
                    .distinct('branchs')
                    .lean()
            }
            let res = await Branch.findOne({
                ...user.role==='супервайзер'?{$and: [{_id: {$in: districts}}, {_id}]}:{_id},
                ...user.legalObject?{legalObject: user.legalObject, del: {$ne: true}}:{}
            })
                .populate({
                    path: 'legalObject',
                    select: 'name _id'
                })
                .lean()
            return res
        }
    },
};

const resolversMutation = {
    addBranch: async(parent, {legalObject, address, calcItemAttribute, bType_v2, pType_v2, ugns_v2, name, locality, postalCode, route, streetNumber, geo}, {user}) => {
        if(['admin', 'superadmin', 'оператор'].includes(user.role)&&user.add) {
            let _object = new Branch({
                sync: true,
                legalObject,
                bType_v2,
                pType_v2,
                address,
                calcItemAttribute,
                ugns_v2,
                name,
                locality,
                postalCode,
                route,
                streetNumber,
                geo
            });
            _object = await Branch.create(_object)
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
    setBranch: async(parent, {_id, bType_v2, address, pType_v2, calcItemAttribute, ugns_v2, name, locality, postalCode, route, streetNumber, geo}, {user}) => {
        if(['admin', 'superadmin', 'оператор'].includes(user.role)&&user.add&&!(await WorkShift.findOne({branch: _id, end: null}).select('_id').lean())) {
            let object = await Branch.findById(_id)
            let history = new History({
                who: user._id,
                where: object._id,
                what: ''
            });
            if(name){
                history.what = `name:${object.name}→${name};`
                object.name = name
            }
            if(address){
                history.what = `${history.what} address:${object.address}→${address};`
                object.address = address
            }
            if(locality){
                history.what = `${history.what} locality:${object.locality}→${locality};`
                object.locality = locality
            }
            if(calcItemAttribute!=undefined){
                history.what = `${history.what} calcItemAttribute:${object.calcItemAttribute}→${calcItemAttribute};`
                object.calcItemAttribute = calcItemAttribute
            }
            if(postalCode){
                history.what = `${history.what} postalCode:${object.postalCode}→${postalCode};`
                object.postalCode = postalCode
            }
            if(route){
                history.what = `${history.what} route:${object.route}→${route};`
                object.route = route
            }
            if(streetNumber){
                history.what = `${history.what} streetNumber:${object.streetNumber}→${streetNumber};`
                object.streetNumber = streetNumber
            }
            if(bType_v2!=undefined){
                history.what = `${history.what} bType_v2:${object.bType_v2}→${bType_v2};`
                object.bType_v2 = bType_v2
            }
            if(ugns_v2!=undefined){
                history.what = `${history.what} ugns_v2:${object.ugns_v2}→${ugns_v2};`
                object.ugns_v2 = ugns_v2
            }
            if(pType_v2!=undefined){
                history.what = `${history.what} pType_v2:${object.pType_v2}→${pType_v2};`
                object.pType_v2 = pType_v2
            }
            if(geo){
                history.what = `${history.what} Геолокация;`
                object.geo = geo
            }
            await object.save();
            await History.create(history)

            let cashboxes = await Cashbox.find({branch: _id, del: {$ne: true}}).lean()
            for(let i=0; i<cashboxes.length; i++) {
                await reregisterCashbox(cashboxes[i])
            }

            return 'OK'
        }
        return 'ERROR'
    },
    deleteBranch: async(parent, { _id }, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.add&&!(await WorkShift.findOne({branch: _id, end: null}).select('_id').lean())) {
            let object = await Branch.findOne({_id})
            object.del = true
            await object.save();

            await District.updateMany({branchs: _id}, {$pull: { branchs: _id}})
            await IntegrationObject.deleteOne({branch: _id})
            let history = new History({
                who: user._id,
                where: _id,
                what: 'Удаление'
            });
            await History.create(history)
            return 'OK'
        }
        return 'ERROR'
    },
    restoreBranch: async(parent, { _id }, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.add) {
            let object = await Branch.findOne({_id})
            object.del = false

            await object.save();
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