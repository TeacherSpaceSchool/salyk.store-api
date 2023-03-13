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
            email: [],
            responsiblePerson: 'test',
            ofd: true,
            sync: true,
            syncMsg: '',
            taxpayerType_v2: 'ENTITY',

            taxSystemName_v2: 'Общий налоговый режим',
            taxSystemCode_v2: 0,
            ndsTypeCode_v2: 1,
            ndsTypeRate_v2: 12,
            nspTypeCode_v2: 1,
            nspTypeRate_v2: 1,
            ugns_v2: 2,
            vatPayer_v2: true
        });
        _object = await LegalObject.create(_object)
        let categoryLegalObject = new CategoryLegalObject({
            categorys: [],
            legalObject: _object._id
        });
        await CategoryLegalObject.create(categoryLegalObject)
    }
}
