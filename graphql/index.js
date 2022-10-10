const { gql, ApolloServer,  } = require('apollo-server-express');
const { RedisPubSub } = require('graphql-redis-subscriptions');
const pubsub = new RedisPubSub();
module.exports.pubsub = pubsub;
const Blog = require('./blog');
const Branch = require('./branch');
const District = require('./district');
const KKM20 = require('./kkm-2.0');
const Cashbox = require('./cashbox');
const Report = require('./report');
const Category = require('./category');
const Client = require('./client');
const ConnectionApplication = require('./connectionApplication');
const FullDeleteLegalObject = require('./fullDeleteLegalObject');
const Consignation = require('./consignation');
const WithdrawHistory = require('./withdrawHistory');
const History = require('./history');
const DepositHistory = require('./depositHistory');
const Prepayment = require('./prepayment');
const Contact = require('./contact');
const Error = require('./error');
const ModelsError = require('../models/error');
const Faq = require('./faq');
const Statistic = require('./statistic');
const File = require('./file');
const Integration = require('./integration');
const IntegrationObject = require('./integrationObject');
const Item = require('./item');
const ItemBarCode = require('./itemBarCode');
const LegalObject = require('./legalObject');
const NotificationStatistic = require('./notificationStatistic');
const Passport = require('./passport');
const Payment = require('./payment');
const Review = require('./review');
const Sale = require('./sale');
const Tariff = require('./tariff');
const User = require('./user');
const Workshift = require('./workshift');
const { verifydeuserGQL } = require('../module/passport');
const { GraphQLScalarType } = require('graphql');
const { withFilter } = require('graphql-subscriptions');
const RELOAD_DATA = 'RELOAD_DATA';
const depthLimit  = require('graphql-depth-limit')
const { GraphQLUpload, graphqlUploadExpress } = require('graphql-upload');

const typeDefs = gql`
    scalar Upload
    scalar Date
    type Data {
        name: String
        value: String
    }
    input InputData {
        name: String
        value: String
    }
    type Social {
        url: String
        image: String
    }
    type ReloadData {
        who: ID
        type: String
        ids: [ID]
        roles: [String]
        message: String
    }
    ${Blog.type}
    ${FullDeleteLegalObject.type}
    ${Branch.type}
    ${District.type}
    ${Cashbox.type}
    ${KKM20.type}
    ${Report.type}
    ${Category.type}
    ${Client.type}
    ${ConnectionApplication.type}
    ${Consignation.type}
    ${WithdrawHistory.type}
    ${History.type}
    ${DepositHistory.type}
    ${Prepayment.type}
    ${Contact.type}
    ${Error.type}
    ${Faq.type}
    ${Statistic.type}
    ${File.type}
    ${Item.type}
    ${Integration.type}
    ${IntegrationObject.type}
    ${ItemBarCode.type}
    ${LegalObject.type}
    ${NotificationStatistic.type}
    ${Passport.type}
    ${Payment.type}
    ${Review.type}
    ${Sale.type}
    ${Tariff.type}
    ${User.type}
    ${Workshift.type}
    type Mutation {
        ${Contact.mutation}
        ${Blog.mutation}
        ${Statistic.mutation}
        ${Branch.mutation}
        ${District.mutation}
        ${Cashbox.mutation}
        ${KKM20.mutation}
        ${Report.mutation}
        ${Category.mutation}
        ${Client.mutation}
        ${ConnectionApplication.mutation}
        ${FullDeleteLegalObject.mutation}
        ${Error.mutation}
        ${Faq.mutation}
        ${File.mutation}
        ${Item.mutation}
        ${Integration.mutation}
        ${IntegrationObject.mutation}
        ${ItemBarCode.mutation}
        ${LegalObject.mutation}
        ${NotificationStatistic.mutation}
        ${Passport.mutation}
        ${Payment.mutation}
        ${Review.mutation}
        ${Sale.mutation}
        ${Tariff.mutation}
        ${User.mutation}
        ${Workshift.mutation}
    }
    type Query {
        ${Contact.query}
        ${Blog.query}
        ${Branch.query}
        ${District.query}
        ${FullDeleteLegalObject.query}
        ${Cashbox.query}
        ${KKM20.query}
        ${Report.query}
        ${Category.query}
        ${Client.query}
        ${ConnectionApplication.query}
        ${Consignation.query}
        ${WithdrawHistory.query}
        ${History.query}
        ${DepositHistory.query}
        ${Prepayment.query}
        ${Passport.query}
        ${Payment.query}
        ${Review.query}
        ${Sale.query}
        ${Tariff.query}
        ${User.query}
        ${Error.query}
        ${Faq.query}
        ${Statistic.query}
        ${File.query}
        ${Item.query}
        ${Integration.query}
        ${IntegrationObject.query}
        ${ItemBarCode.query}
        ${LegalObject.query}
        ${NotificationStatistic.query}
        ${Workshift.query}
    }
    type Subscription {
          reloadData: ReloadData
    }
`;

const resolvers = {
    Upload: GraphQLUpload,
    Date: new GraphQLScalarType({
        name: 'Date',
        description: 'Date custom scalar type',
        parseValue(value) {
            return new Date(value);
        },
        serialize(value) {
            return new Date(value).getTime();
        },
        parseLiteral(ast) {
            if (ast.kind === Kind.INT) {
                return new Date(ast.value)
            }
            return null;
        },
    }),
    Query: {
        ...Contact.resolvers,
        ...Blog.resolvers,
        ...Branch.resolvers,
        ...District.resolvers,
        ...Cashbox.resolvers,
        ...KKM20.resolvers,
        ...Report.resolvers,
        ...Category.resolvers,
        ...Client.resolvers,
        ...ConnectionApplication.resolvers,
        ...Consignation.resolvers,
        ...DepositHistory.resolvers,
        ...WithdrawHistory.resolvers,
        ...History.resolvers,
        ...Prepayment.resolvers,
        ...Passport.resolvers,
        ...Payment.resolvers,
        ...Review.resolvers,
        ...Sale.resolvers,
        ...Tariff.resolvers,
        ...FullDeleteLegalObject.resolvers,
        ...User.resolvers,
        ...Workshift.resolvers,
        ...Error.resolvers,
        ...Faq.resolvers,
        ...Statistic.resolvers,
        ...File.resolvers,
        ...Item.resolvers,
        ...Integration.resolvers,
        ...IntegrationObject.resolvers,
        ...ItemBarCode.resolvers,
        ...LegalObject.resolvers,
        ...NotificationStatistic.resolvers,
    },
    Mutation: {
        ...Statistic.resolversMutation,
        ...Contact.resolversMutation,
        ...ConnectionApplication.resolversMutation,
        ...FullDeleteLegalObject.resolversMutation,
        ...Blog.resolversMutation,
        ...Branch.resolversMutation,
        ...District.resolversMutation,
        ...Cashbox.resolversMutation,
        ...KKM20.resolversMutation,
        ...Report.resolversMutation,
        ...Category.resolversMutation,
        ...Client.resolversMutation,
        ...Passport.resolversMutation,
        ...Payment.resolversMutation,
        ...Review.resolversMutation,
        ...Sale.resolversMutation,
        ...Tariff.resolversMutation,
        ...User.resolversMutation,
        ...Workshift.resolversMutation,
        ...Error.resolversMutation,
        ...Faq.resolversMutation,
        ...File.resolversMutation,
        ...Item.resolversMutation,
        ...Integration.resolversMutation,
        ...IntegrationObject.resolversMutation,
        ...ItemBarCode.resolversMutation,
        ...LegalObject.resolversMutation,
        ...NotificationStatistic.resolversMutation,
    },
    Subscription: {
        reloadData: {
            subscribe: withFilter(
                () => pubsub.asyncIterator(RELOAD_DATA),
                (payload, variables, {user} ) => {
                    return (
                        user&&user.role&&user._id&&user._id.toString()!==payload.reloadData.who&&
                        (
                            payload.reloadData.roles.includes(user.role)||
                            payload.reloadData.ids.toString().includes(user._id.toString())
                        )
                    )
                },
            )
        },
    }
};

const loggerPlugin = {
    requestDidStart(requestContext) {
        console.log(requestContext.request.query);
    },
};

const run = (app)=>{
    const server = new ApolloServer({
        playground: false,
        uploads: false,
        typeDefs,
        //plugins: [loggerPlugin],
        resolvers,
        validationRules: [ depthLimit(10) ],
        subscriptions: {
            keepAlive: 1000,
            onConnect: async (connectionParams) => {
                if (connectionParams&&connectionParams.authorization) {
                    let user = await verifydeuserGQL({headers: {authorization: connectionParams.authorization}}, {})
                    return {
                        user: user,
                    }
                }
                else return {
                    user: {}
                }
            },
            onDisconnect: (webSocket, context) => {
                // ...
            },
        },
        context: async (ctx) => {
            if (ctx.connection) {
                return ctx.connection.context;
            }
            else if(ctx&&ctx.req) {
                ctx.res.header('ACCEPT-CH', 'UA-Full-Version, UA-Mobile, UA-Model, UA-Arch, UA-Platform, ECT, Device-Memory, RTT');
                let user = await verifydeuserGQL(ctx.req, ctx.res)
                return {req: ctx.req, res: ctx.res, user: user};
            }
        },
        formatError: async (err) => {
            console.error(err)
            let object = new ModelsError({
                err: err.message,
                path: JSON.stringify(err.path)
            });
            /*if(!object.path&&err.extensions&&err.extensions.exception&&err.extensions.exception.stacktrace)
                object.path = JSON.stringify(err.extensions.exception.stacktrace)*/
            await ModelsError.create(object)
            return err;
        }
    })
    app.use(graphqlUploadExpress());
    server.applyMiddleware({ app, path : '/graphql', cors: false })
    return server
}

module.exports.run = run;
