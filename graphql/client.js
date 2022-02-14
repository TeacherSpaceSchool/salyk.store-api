const Client = require('../models/client');
const Consignation = require('../models/consignation');
const Prepayment = require('../models/prepayment');
const { saveImage, deleteFile, urlMain } = require('../module/const');
const IntegrationObject = require('../models/integrationObject');

const type = `
  type Client {
    _id: ID
    createdAt: Date
    legalObject: LegalObject
    name: String
    phone: [String]
    address: String
    email: [String]
    del: Boolean
    info: String
    inn: String
    files: [String]
  }
`;

const query = `
    clients(search: String, skip: Int, legalObject: ID): [Client]
    client(_id: ID!): Client
    clientsCount(search: String, legalObject: ID): Int
`;

const mutation = `
    addClient(legalObject: ID!, name: String!, phone: [String]!, inn: String!, uploads: [Upload]!, address: String!, email: [String]!, info: String!): Client
    setClient(_id: ID!, name: String, phone: [String], inn: String, files: [String], uploads: [Upload], address: String, email: [String], info: String): String
    deleteClient(_id: ID!): String
`;

const resolvers = {
    clients: async(parent, {search, skip, legalObject}, {user}) => {
        if(['admin', 'superadmin', 'управляющий',/*].includes(user.role)||(search&&search.length>2||skip==undefined)&&[*/'кассир', 'супервайзер'].includes(user.role)) {
            if(user.legalObject) legalObject = user.legalObject
            return await Client.find({
                del: {$ne: true},
                ...search&&search.length?{$or: [{name: {'$regex': search, '$options': 'i'}}, {inn: {'$regex': search, '$options': 'i'}}]}:{},
                ...legalObject ? {legalObject} : {}
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 15 : 10000000000)
                .sort('name')
                .populate({
                    path: 'legalObject',
                    select: 'name _id'
                })
                .lean()
        }
    },
    client: async(parent, {_id}, {user}) => {
        if(['admin', 'superadmin', 'управляющий', 'кассир', 'супервайзер'].includes(user.role)) {
            let res = await Client.findOne({
                _id,
                ...user.legalObject ? {legalObject: user.legalObject} : {}
            })
                .populate({
                    path: 'legalObject',
                    select: 'name _id'
                })
                .lean()
            return res
        }
    },
    clientsCount: async(parent, {search, legalObject}, {user}) => {
        if(['admin', 'superadmin', 'управляющий',/*].includes(user.role)||(search&&search.length>2||skip==undefined)&&[*/'кассир', 'супервайзер'].includes(user.role)) {
            if(user.legalObject) legalObject = user.legalObject
            return await Client.countDocuments({
                del: {$ne: true},
                ...search&&search.length?{$or: [{name: {'$regex': search, '$options': 'i'}}, {inn: {'$regex': search, '$options': 'i'}}]}:{},
                ...legalObject ? {legalObject: legalObject} : {}
            })
                .lean()
        }
        return 0
    },
};

const resolversMutation = {
    addClient: async(parent, {legalObject, name, phone, address, email, info, inn, uploads}, {user}) => {
        if(['admin', 'superadmin', 'управляющий', 'кассир', 'супервайзер'].includes(user.role)&&user.add) {
            if(user.legalObject) legalObject = user.legalObject
            let files = []
            for(let i = 0; i<uploads.length;i++) {
                let { createReadStream, filename } = await uploads[i];
                let stream = createReadStream()
                filename = await saveImage(stream, filename)
                files.push(urlMain+filename)
            }
            let client = new Client({
                name,
                legalObject,
                phone,
                address,
                info,
                email,
                inn,
                files,

            });
            client = await Client.create(client)
            let consignation = new Consignation({
                legalObject,
                client: client._id,
                consignation: 0,
                paid: 0,
                debt: 0
            });
            await Consignation.create(consignation)
            let prepayment = new Prepayment({
                legalObject,
                client: client._id,
                prepayment: 0,
                used: 0,
                balance: 0
            });
            await Prepayment.create(prepayment)
            return client
        }
    },
    setClient: async(parent, {_id, name, phone, address, email, info, inn, files, uploads}, {user}) => {
        if(['admin', 'superadmin', 'управляющий', 'кассир', 'супервайзер'].includes(user.role)&&user.add) {
            let object = await Client.findOne({
                _id,
                ...user.legalObject?{legalObject: user.legalObject}:{},
            })
            if(name) object.name = name
            if(phone) object.phone = phone
            if(address) object.address = address
            if(email) object.email = email
            if(info) object.info = info
            if(inn) object.inn = inn
            if(files)
                for (let i = 0; i < object.files.length; i++)
                    if (!files.includes(object.files[i])) {
                        await deleteFile(object.files[i])
                        object.files.splice(i, 1)
                        i -= 1
                    }
            if(uploads&&uploads.length)
                for(let i = 0; i<uploads.length;i++) {
                    let { createReadStream, filename } = await uploads[i];
                    let stream = createReadStream()
                    filename = await saveImage(stream, filename)
                    object.files = [urlMain+filename, ...object.files]
                }
            await object.save();
            return 'OK'
        }
        return 'ERROR'
    },
    deleteClient: async(parent, { _id }, {user}) => {
        if(['admin', 'superadmin', 'управляющий', 'кассир', 'супервайзер'].includes(user.role)&&user.add) {
            await Client.updateOne({
                _id,
                ...user.legalObject?{legalObject: user.legalObject}:{},
            }, {del: true})
            await IntegrationObject.deleteOne({client: _id})
            /*await Consignation.deleteOne({client: _id})
            await Prepayment.deleteOne({client: _id})*/
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