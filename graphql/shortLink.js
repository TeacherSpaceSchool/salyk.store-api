const ShortLink = require('../models/shortLink');
const mongoose = require('mongoose');

const query = `
    shortLink(_id: ID!): String
`;

const resolvers = {
    shortLink: async(parent, {_id}) => {
        if(mongoose.Types.ObjectId.isValid(_id)) {
            let shortLink = await ShortLink.findById(_id)
                .select('link')
                .lean()
            if (shortLink)
                return shortLink.link
        }
            return 'ERROR'
    }
};

module.exports.query = query;
module.exports.resolvers = resolvers;