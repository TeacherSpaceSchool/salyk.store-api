const Blog = require('../models/blog');
const { saveImage, deleteFile, urlMain, saveFile } = require('../module/const');

const type = `
  type Blog {
    _id: ID
    image: String
    text: String
    name: String
    createdAt: Date
  }
`;

const query = `
    blogs(skip: Int, search: String): [Blog]
`;

const mutation = `
    addBlog(image: Upload!, text: String!, name: String!): Blog
    setBlog(_id: ID!, image: Upload, text: String, name: String): String
    deleteBlog(_id: ID!): String
`;

const resolvers = {
    blogs: async(parent, {skip, search}, {user}) => {
        if(user.role) {
            return await Blog.find({
                ...search&&search.length?{name: {'$regex': search, '$options': 'i'}}:{}
            })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 15 : 10000000000)
                .sort('-createdAt')
                .lean()
        }
    }
};

const resolversMutation = {
    addBlog: async(parent, {image, text, name}, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.add) {
            let { createReadStream, filename } = await image;
            let stream = createReadStream()
            filename = await saveImage(stream, filename)
            let _object = new Blog({
                image: urlMain+filename,
                text,
                name
            });
            _object = await Blog.create(_object)
            return _object
        }
    },
    setBlog: async(parent, {_id, image, text, name}, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.add) {
            let object = await Blog.findById(_id)
            if (image) {
                let {createReadStream, filename} = await image;
                let stream = createReadStream()
                await deleteFile(object.image)
                filename = await saveImage(stream, filename)
                object.image = urlMain + filename
            }
            if(text)object.text = text
            if(name)object.name = name
            await object.save();
            return 'OK'
        }
        return 'ERROR'
    },
    deleteBlog: async(parent, { _id }, {user}) => {
        if(['admin', 'superadmin'].includes(user.role)&&user.add) {
            let object = await Blog.findOne({_id}).select('image').lean()
            await deleteFile(object.image)
            await Blog.deleteOne({_id})
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