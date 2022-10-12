const LegalObject = require('../models/legalObject');
const CategoryLegalObject = require('../models/categoryLegalObject');

module.exports.createTestLegalObject = async () => {
    let testLegalObject = await LegalObject.findOne({name: 'Test113 ОсОО Архикойн'}).select('_id').lean()
    if(!testLegalObject){
        let _object = new LegalObject({
            accessLogin: 'daseron415161@gmail.com',
            accessPassword: '!12345678',
            name: 'Test113 ОсОО Архикойн',
            inn: '00103201810134',
            address: 'г.Бишкек, Бишкек',
            phone: [],
            status: 'active',
            ugns_v2: 2,
            email: [],
            responsiblePerson: 'test',
            ofd: true,
            taxSystem_v2: 0,
            ndsType_v2: 1,
            nspType_v2: 4,
            vatPayer_v2: true,
            sync: true,
            syncMsg: '',
            taxpayerType_v2: 'ENTITY'
        });
        _object = await LegalObject.create(_object)
        let categoryLegalObject = new CategoryLegalObject({
            categorys: [],
            legalObject: _object._id
        });
        await CategoryLegalObject.create(categoryLegalObject)
    }
}
