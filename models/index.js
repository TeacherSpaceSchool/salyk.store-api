let mongoose = require('mongoose');
let connect = function() {
    mongoose.connect('mongodb://localhost:27017/admin',
        {
            ...process.env.pass&&process.env.user? {user: process.env.user.trim(), pass: process.env.pass.trim()}:{},
            keepAlive: 1,
            useCreateIndex: true,
            useNewUrlParser: true,
            /*reconnectTries: Number.MAX_VALUE,
            reconnectInterval: 1000,*/
            connectTimeoutMS: 30000,
            useUnifiedTopology: true,
            //allowDiskUse: true
        },
        function (err) {

            if (err) {
                throw err;
            }
            console.log('Successfully connected');

        }
    );
};
module.exports.connect = connect;