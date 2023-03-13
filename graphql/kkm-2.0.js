const {getFnList, deleteFn, reserveFn, getDataByInn, getTaxSystems, getNspTypes, getNdsTypes, getBusinessActivities,
    getEntrepreneurshipObjects, getTaxAuthorityDepartments, getCalcItemAttributes
} = require('../module/kkm-2.0');

const type = `
  type INN {
    inn: String
    companyName: String
    type: String
    legalAddress: String
    taxAuthorityDepartment: Int
    activityCode: String
    vatPayer: Boolean
  }
  type FN {
    number: String
    status: String
  }
  type ObjectKKM {
    name: String
    code: Int
  }
`;

const query = `
    taxSystems: [ObjectKKM]
    nspTypes: [ObjectKKM]
    ndsTypes: [ObjectKKM]
    businessActivities: [ObjectKKM]
    entrepreneurshipObjects: [ObjectKKM]
    taxAuthorityDepartments: [ObjectKKM]
    calcItemAttributes: [ObjectKKM]
    tpDataByINNforBusinessActivity(inn: String!): INN
    fns(_id: ID!): [FN]
`;

const mutation = `
    deleteFn(_id: ID!, fn: String!): String
    reserveFn(_id: ID!): FN
`;

const resolvers = {
    tpDataByINNforBusinessActivity: async(parent, {inn}, {user}) => {
        if(['admin', 'superadmin', 'оператор'].includes(user.role)) {
            let data = await getDataByInn(inn)
            return {
                ...data,
                inn: data.tin
            }
        }
    },
    fns: async(parent, {_id}, {user}) => {
        if(['admin', 'superadmin', 'оператор'].includes(user.role))
            return await getFnList(_id)
        return []
    },
    taxSystems: async(parent, args, {user}) => {
        if(['admin', 'superadmin', 'оператор'].includes(user.role))
            return await getTaxSystems()
        return []
    },
    nspTypes: async(parent, args, {user}) => {
        if(['admin', 'superadmin', 'оператор'].includes(user.role))
            return await getNspTypes()
        return []
    },
    ndsTypes: async(parent, args, {user}) => {
        if(['admin', 'superadmin', 'оператор'].includes(user.role))
            return await getNdsTypes()
        return []
    },
    businessActivities: async(parent, args, {user}) => {
        if(['admin', 'superadmin', 'оператор'].includes(user.role))
            return await getBusinessActivities()
        return []
    },
    entrepreneurshipObjects: async(parent, args, {user}) => {
        if(['admin', 'superadmin', 'оператор'].includes(user.role))
            return await getEntrepreneurshipObjects()
        return []
    },
    taxAuthorityDepartments: async(parent, args, {user}) => {
        if(['admin', 'superadmin', 'оператор'].includes(user.role))
            return await getTaxAuthorityDepartments()
        return []
    },
    calcItemAttributes: async(parent, args, {user}) => {
        if(['admin', 'superadmin', 'оператор'].includes(user.role))
            return await getCalcItemAttributes()
        return []
    }
};

const resolversMutation = {
    reserveFn: async(parent, {_id}, {user}) => {
        if(['admin', 'superadmin', 'оператор'].includes(user.role)) {
            return reserveFn(_id)
        }
        return null
    },
    deleteFn: async(parent, {_id, fn}, {user}) => {
        if(['admin', 'superadmin', 'оператор'].includes(user.role)) {
            return await deleteFn(_id, fn)?'OK':'ERROR'
        }
        return 'ERROR'
    }
};

module.exports.resolversMutation = resolversMutation;
module.exports.mutation = mutation;
module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;