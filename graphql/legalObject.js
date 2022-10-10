const LegalObject = require('../models/legalObject');
const IntegrationObject = require('../models/integrationObject');
const Integration = require('../models/integration');
const CategoryLegalObject = require('../models/categoryLegalObject');
const WorkShift = require('../models/workshift');
const User = require('../models/user');
const History = require('../models/history');
const District = require('../models/district');
const {authLogin} = require('../module/kkm-2.0');
const {ndsTypes, nspTypes, taxSystems, ugnses} = require('../module/kkm-2.0-catalog');

const type = `
  type LegalObject {
    _id: ID
    createdAt: Date
    name: String
    inn: String
    email: [String]
    address: String
    phone: [String]
    status: String
    responsiblePerson: String
    del: Boolean
    ofd: Boolean
    sync: Boolean
    syncMsg: String
    agent: User
    
    taxSystem_v2: Int
    ndsType_v2: Int
    nspType_v2: Int
    ugns_v2: Int
    vatPayer_v2: Boolean
    taxpayerType_v2: String
  
    rateTaxe: String
    
    accessLogin: String
    accessPassword: String
    accessToken: String
    accessTokenTTL: Date
    refreshToken: String
    refreshTokenTTL: Date
  }
`;

const query = `
    legalObjects(skip: Int, search: String): [LegalObject]
    legalObjectsCount(search: String): Int
    legalObjectsTrash(skip: Int, search: String): [LegalObject]
    legalObject(_id: ID!): LegalObject
`;

const mutation = `
    addLegalObject(name: String!, accessLogin: String!, taxSystem_v2: Int!, taxpayerType_v2: String!, ndsType_v2: Int!, nspType_v2: Int!, ugns_v2: Int!, vatPayer_v2: Boolean!, accessPassword: String!, agent: ID, ofd: Boolean!, inn: String!, address: String!, email: [String]!, phone: [String]!, responsiblePerson: String!): String
    setLegalObject(_id: ID!, name: String, accessLogin: String, accessPassword: String, taxpayerType_v2: String, taxSystem_v2: Int, ndsType_v2: Int, nspType_v2: Int, ugns_v2: Int, vatPayer_v2: Boolean, agent: ID, ofd: Boolean, address: String, email: [String], phone: [String], responsiblePerson: String): String
    onoffLegalObject(_id: ID!): String
    deleteLegalObject(_id: ID!): String
    restoreLegalObject(_id: ID!): String
`;

const resolvers = {
    legalObjects: async(parent, {skip, search}, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)||search&&search.length>2&&user.role==='оператор') {
            return await LegalObject.find({
                ...search&&search.length?{$or: [{name: {'$regex': search, '$options': 'i'}}, {inn: {'$regex': search, '$options': 'i'}}]}:{},
                del: {$ne: true},
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 30 : 10000000000)
                .select('_id createdAt name inn address phone status del sync')
                .sort('name')
                .lean()
        }
        return []
    },
    legalObjectsCount: async(parent, {search}, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)||search&&search.length>2&&user.role==='оператор') {
            return await LegalObject.countDocuments({
                ...search&&search.length?{$or: [{name: {'$regex': search, '$options': 'i'}}, {inn: {'$regex': search, '$options': 'i'}}]}:{},
                del: {$ne: true},
            })
                .lean()
        }
        return 0
    },
    legalObjectsTrash: async(parent, {skip, search}, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)) {
            return await LegalObject.find({
                ...search&&search.length?{$or: [{name: {'$regex': search, '$options': 'i'}}, {inn: {'$regex': search, '$options': 'i'}}]}:{},
                del: true
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 30 : 10000000000)
                .select('_id createdAt name inn address phone status _id del sync')
                .sort('name')
                .lean()
        }
    },
    legalObject: async(parent, {_id}, {user}) => {
        if(['admin', 'superadmin', 'управляющий', 'оператор', 'кассир'].includes(user.role)) {
            let res = await LegalObject.findOne({
                ...user.legalObject?{del: {$ne: true}} : {},
                _id: user.legalObject?user.legalObject:_id
            })
                .populate({
                    path: 'agent',
                    select: 'name _id'
                })
                .lean()
            return user.role==='кассир'?{
                _id: res._id,
                ndsType_v2: res.ndsType_v2,
                nspType_v2: res.nspType_v2,
            }:res
        }
    },
};

const resolversMutation = {
    addLegalObject: async(parent, {name, accessLogin, accessPassword, taxpayerType_v2, taxSystem_v2, ndsType_v2, nspType_v2, ugns_v2, vatPayer_v2, agent, inn, address, phone, email, responsiblePerson, ofd}, {user}) => {
        if(['admin', 'superadmin', 'оператор'].includes(user.role)&&user.add&&!(await LegalObject.findOne({inn}).select('_id').lean())) {
            let _object = new LegalObject({
                name,
                inn,
                taxSystem_v2,
                ndsType_v2,
                address,
                agent,
                phone,
                accessLogin,
                sync: true,
                syncMsg: '',
                accessPassword,
                taxpayerType_v2,
                status: 'active',
                ugns_v2,
                email,
                nspType_v2,
                vatPayer_v2,
                responsiblePerson,
                ofd: ['superadmin', 'admin'].includes(user.role)?ofd:true
            });
            _object = await LegalObject.create(_object)
            await authLogin(_object._id)
            let categoryLegalObject = new CategoryLegalObject({
                categorys: [],
                legalObject: _object._id
            });
            await CategoryLegalObject.create(categoryLegalObject)
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
    setLegalObject: async(parent, {_id, agent, accessLogin, accessPassword, name, taxpayerType_v2, taxSystem_v2, ndsType_v2, nspType_v2, ugns_v2, vatPayer_v2, address, phone, email, ofd, responsiblePerson}, {user}) => {
        if(['admin', 'superadmin', 'оператор'].includes(user.role)&&user.add&&!(await WorkShift.findOne({branch: _id, end: null}).select('_id').lean())) {
            let object = await LegalObject.findById(_id)
            let history = new History({
                who: user._id,
                where: object._id,
                what: ''
            });
            if(name){
                history.what = `name:${object.name}→${name};`
                object.name = name
            }
            if(agent!==object.agent){
                history.what = `${history.what} agent:${object.agent}→${agent};`
                object.agent = agent
            }
            if(accessLogin){
                history.what = `${history.what} accessLogin:${object.accessLogin}→${accessLogin};`
                object.accessLogin = accessLogin
            }
            if(taxpayerType_v2!=undefined){
                history.what = `${history.what} taxpayerType_v2:${object.taxpayerType_v2}→${taxpayerType_v2};`
                object.taxpayerType_v2 = taxpayerType_v2
            }
            if(accessPassword){
                history.what = `${history.what} accessPassword:${object.accessPassword}→${accessPassword};`
                object.accessPassword = accessPassword
            }
            if(accessLogin||accessPassword) {
                object.accessToken = null
                object.accessTokenTTL = null
                object.refreshToken = null
                object.refreshTokenTTL = null
            }
            if(address){
                history.what = `${history.what} address:${object.address}→${address};`
                object.address = address
            }
            if(ndsType_v2!=undefined){
                history.what = `${history.what} ndsType_v2:${ndsTypes[object.ndsType_v2]}→${ndsTypes[ndsType_v2]};`
                object.ndsType_v2 = ndsType_v2
            }
            if(nspType_v2!=undefined){
                history.what = `${history.what} nspType_v2:${nspTypes[object.nspType_v2]}→${nspTypes[nspType_v2]};`
                object.nspType_v2 = nspType_v2
            }
            if(taxSystem_v2!=undefined){
                history.what = `${history.what} taxSystem_v2:${taxSystems[object.taxSystem_v2]}→${taxSystems[taxSystem_v2]};`
                object.taxSystem_v2 = taxSystem_v2
            }
            if(phone){
                history.what = `${history.what} phone:${object.phone}→${phone};`
                object.phone = phone
            }
            if(vatPayer_v2!=undefined){
                history.what = `${history.what} vatPayer_v2:${object.vatPayer_v2}→${vatPayer_v2};`
                object.vatPayer_v2 = vatPayer_v2
            }
            if(ugns_v2!=undefined){
                history.what = `${history.what} ugns_v2:${ugnses[object.ugns_v2]}→${ugnses[ugns_v2]};`
                object.ugns_v2 = ugns_v2
            }
            if(responsiblePerson){
                history.what = `${history.what} responsiblePerson:${object.responsiblePerson}→${responsiblePerson};`
                object.responsiblePerson = responsiblePerson
            }
            if(email){
                history.what = `${history.what} email:${object.email}→${email};`
                object.email = email
            }
            if(['superadmin', 'admin'].includes(user.role)&&user.add&&ofd!==undefined){
                history.what = `${history.what} ofd:${object.ofd}→${ofd};`
                object.ofd = ofd
            }
            await object.save();
            let now = new Date()
            if(!object.refreshToken||object.accessTokenTTL<now||object.refreshTokenTTL<now)
                await authLogin(object._id)
            await History.create(history)
            return 'OK'
        }
        return 'ERROR'
    },
    onoffLegalObject: async(parent, { _id }, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.add&&!(await WorkShift.findOne({branch: _id, end: null}).select('_id').lean())) {
            let object = await LegalObject.findOne({_id})
            object.status = object.status==='active'?'deactive':'active'
            if(object.status==='deactive')
                await User.updateMany({legalObject: _id}, {status: 'deactive'})
            object.save()
            let history = new History({
                who: user._id,
                where: object._id,
                what: object.status==='active'?'Включение':'Отключение'
            });
            await History.create(history)
            return 'OK'
        }
        return 'ERROR'
    },
    deleteLegalObject: async(parent, { _id }, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.add&&!(await WorkShift.findOne({branch: _id, end: null}).select('_id').lean())) {
            let object = await LegalObject.findOne({_id})
            object.del = true
            await object.save();
            await User.updateMany({legalObject: _id}, {status: 'deactive'})
            await Integration.deleteOne({legalObject: _id})
            await IntegrationObject.deleteMany({legalObject: _id})
            await District.deleteMany({legalObject: _id})
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
    restoreLegalObject: async(parent, { _id }, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.add) {
            let object = await LegalObject.findOne({_id})
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