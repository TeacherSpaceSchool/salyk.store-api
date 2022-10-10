const {getFnList, deleteFn, reserveFn, getDataByInn} = require('../module/kkm-2.0');

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
`;

const query = `
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