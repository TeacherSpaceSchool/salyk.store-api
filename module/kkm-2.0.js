const LegalObject = require('../models/legalObject');
const Branch = require('../models/branch');
const Sale = require('../models/sale');
const Cashbox = require('../models/cashbox');
const WorkShift = require('../models/workshift');
const Report = require('../models/report');
const axios = require('axios');
const {receiptTypes} = require('./kkm-2.0-catalog');
const production = process.env.URL.trim()!=='http://localhost'
const urlTest = 'http://92.62.72.170:30115'
const url = 'http://92.62.72.170:30115'
const urlQRTest = 'http://92.62.72.170:30105'
const urlQR = 'http://92.62.72.170:30105'
const QRCode = require('qrcode')
const {checkInt} = require('./const');
const headers = {
    'Content-Type': 'application/json',
    'CCRModel': 'CloudCR',
    'CCRVersion': '1',
    'Api-Key': 'Cur messor velum?'
}
const headersTest = {
    'Content-Type': 'application/json',
    'CCRModel': 'CloudCR',
    'CCRVersion': '1',
    'Api-Key': 'Cur messor velum?'
}

module.exports.getDataByInn = async (inn)=>{
    try{
        let res = await axios.get(`${!production?urlTest:url}/api/info/preregister/${inn}`)
        return res.data
    } catch (err) {
        console.error(err.response?err.response.data:err)
        return null
    }
};

module.exports.reserveFn = async (legalObject)=>{
    try{
        legalObject = await LegalObject.findById(legalObject)
            .select('inn name')
            .lean()
        let res = await axios.get(`${!production||legalObject.name==='Test113 ОсОО Архикойн'?urlTest:url}/api/service-api/fn/reserve/${legalObject.inn}`,
            {headers: !production||legalObject.name==='Test113 ОсОО Архикойн'?headersTest:headers})
        return res.data.number?res.data:null
    } catch (err) {
        console.error(err.response?err.response.data:err)
        return null
    }
};

module.exports.getFnList = async (legalObject)=>{
    try{
        legalObject = await LegalObject.findById(legalObject)
            .select('inn name')
            .lean()
        let res = await axios.get(`${!production||legalObject.name==='Test113 ОсОО Архикойн'?urlTest:url}/api/service-api/fn/list/${legalObject.inn}`,
            {headers: !production||legalObject.name==='Test113 ОсОО Архикойн'?headersTest:headers})
        let fnList = [], _fnList = !res.data[0]?[]:res.data
        for(let i=0; i<_fnList.length; i++) {
            if(_fnList[i].status==='FREE')
                fnList.push(_fnList[i])
        }
        return fnList
    } catch (err) {
        console.error(err.response?err.response.data:err)
        return []
    }
};

module.exports.deleteFn = async (legalObject, fn)=>{
    try{
        legalObject = await LegalObject.findById(legalObject)
            .select('inn name')
            .lean()
        let res = await axios.delete(`${!production||legalObject.name==='Test113 ОсОО Архикойн'?urlTest:url}/api/service-api/fn/free?tin=${legalObject.inn}&fn=${fn}`,
            {headers: !production||legalObject.name==='Test113 ОсОО Архикойн'?headersTest:headers})
        return res.data===''
    } catch (err) {
        console.error(err.response?err.response.data:err)
        return false
    }
};

module.exports.registerCashbox = async (branch, cashbox, fn)=>{
    try{
        branch = await Branch.findById(branch)
            .lean()
        let legalObject = await LegalObject.findById(branch.legalObject)
            .lean()
        let json = {
            fiscalNumber: fn,
            address: {
                administrativeArea1: '',
                administrativeArea2: branch.administrativeArea_v2,
                country: 'Кыргызстан',
                locality: branch.locality,
                postalCode: branch.postalCode,
                route: branch.route,
                streetNumber: branch.streetNumber,
                location: [branch.geo[0].toString().slice(0, 10), branch.geo[1].toString().slice(0, 10)].toString(),
            },
            vatPayer: legalObject.vatPayer_v2,
            calcItemAttributes: [
                branch.calcItemAttributeCode_v2
            ],
            taxSystems: [
                legalObject.taxSystemCode_v2
            ],
            serialNumber: 'SS000002',
            version: '2',
            storeName: branch.name,
            entrepreneurshipObject: branch.entrepreneurshipObjectCode_v2,
            businessActivity: branch.businessActivityCode_v2,
            taxAuthorityDepartment: branch.ugnsCode_v2
        }
        let res = await axios.post(`${!production||legalObject.name==='Test113 ОсОО Архикойн'?urlTest:url}/api/service-api/cash-register/registration`, json,
            {headers: !production||legalObject.name==='Test113 ОсОО Архикойн'?headersTest:headers})
        return JSON.stringify(res.data)
    } catch (err) {
        console.error(err.response?err.response.data:err)
        return JSON.stringify(err.response?err.response.data:err)
    }
};

module.exports.reregisterCashbox = async (cashbox, updateReasons)=>{
    try{
        let branch = await Branch.findById(cashbox.branch)
            .lean()
        let legalObject = await LegalObject.findById(branch.legalObject)
            .lean()
        let json = {
            fiscalNumber: cashbox.fn,
            regNum: cashbox.registrationNumber,
            address: {
                administrativeArea1: '',
                administrativeArea2: branch.administrativeArea_v2,
                country: 'Кыргызстан',
                locality: branch.locality,
                postalCode: branch.postalCode,
                route: branch.route,
                streetNumber: branch.streetNumber,
                location: [branch.geo[0].toString().slice(0, 10), branch.geo[1].toString().slice(0, 10)].toString(),
            },
            vatPayer: legalObject.vatPayer_v2,
            calcItemAttributes: [
                branch.calcItemAttributeCode_v2
            ],
            taxSystems: [
                legalObject.taxSystemCode_v2
            ],
            storeName: branch.name,
            updateReasons: [
                updateReasons?updateReasons:0
            ],
            entrepreneurshipObject: branch.entrepreneurshipObjectCode_v2,
            businessActivity: branch.businessActivityCode_v2,
            taxAuthorityDepartment: branch.ugnsCode_v2
        }
        let res = await axios.put(`${!production||legalObject.name==='Test113 ОсОО Архикойн'?urlTest:url}/api/service-api/cash-register/registration`, json,
            {headers: !production||legalObject.name==='Test113 ОсОО Архикойн'?headersTest:headers})
        await Cashbox.updateOne({_id: cashbox._id}, {
            $push: {syncData: ['reregisterCashbox', JSON.stringify({date: new Date(), ...res.data})]},
            sync: !!res.data.operatorResponse,
            syncMsg: JSON.stringify(res.data),
            syncType: 'reregisterCashbox'
        })
        return !!res.data.fnNumber
    } catch (err) {
        console.error(err.response?err.response.data:err)
        await Cashbox.updateOne({_id: cashbox._id}, {
            sync: false,
            syncMsg: JSON.stringify(err.response?err.response.data:err),
            syncType: 'reregisterCashbox'
        })
        return false
    }
};

module.exports.deleteCashbox = async (cashbox, fn)=>{
    try{
        cashbox = await Cashbox.findById(cashbox)
            .select('_id legalObject')
            .populate({
                path: 'legalObject',
                select: 'name'
            })
            .lean()
        let res = await axios.delete(`${!production||cashbox.legalObject.name==='Test113 ОсОО Архикойн'?urlTest:url}/api/service-api/cash-register/registration?fn=${fn}&uuid=${cashbox._id.toString()}`,
            {headers: !production||cashbox.legalObject.name==='Test113 ОсОО Архикойн'?headersTest:headers})
        await Cashbox.updateOne({_id: cashbox._id}, {
            $push: {syncData: ['deleteCashbox', JSON.stringify({date: new Date(), ...res.data})]},
            sync: !!res.data.operatorResponse,
            syncMsg: JSON.stringify(res.data),
            syncType: 'deleteCashbox'
        })
        return !!res.data.fnNumber
    } catch (err) {
        console.error(err.response?err.response.data:err)
        await Cashbox.updateOne({_id: cashbox}, {
            sync: false,
            syncMsg: JSON.stringify(err.response?err.response.data:err),
            syncType: 'deleteCashbox'
        })
        return false
    }
};

module.exports.getCashboxState = async (fn, legalObject)=>{
    try{
        legalObject = await LegalObject.findById(legalObject)
            .select('name')
            .lean()
        let res = await axios.get(`${!production||legalObject.name==='Test113 ОсОО Архикойн'?urlTest:url}/api/service-api/cash-register/state/${fn}`,
            {headers: !production||legalObject.name==='Test113 ОсОО Архикойн'?headersTest:headers})
        return res.data.fiscalMemoryNumber?res.data:null
    } catch (err) {
        console.error(err.response?err.response.data:err)
        return []
    }
};

module.exports.openShift2 = async (fn, legalObject, workShift)=>{
    try{
        legalObject = await LegalObject.findById(legalObject)
            .select('name')
            .lean()
        let res = await axios.post(`${!production||legalObject.name==='Test113 ОсОО Архикойн'?urlTest:url}/api/service-api/cash-register/shift/open`, {fnNumber: fn},
            {
                timeout: 30000,
                headers: !production||legalObject.name==='Test113 ОсОО Архикойн'?headersTest:headers
            })
        await WorkShift.updateOne({_id: workShift}, {
            sync: !!(res.data.fields&&res.data.operatorResponse&&!res.data.operatorResponse.fields[1210]),
            syncData: JSON.stringify(res.data),
            syncMsg: JSON.stringify(res.data)
        })
    } catch (err) {
        console.error(err.response?err.response.data:err)
        await WorkShift.updateOne({_id: workShift}, {
            sync: false,
            syncMsg: JSON.stringify(err.response?err.response.data:err)
        })
    }
};

module.exports.closeShift2 = async (fn, legalObject, report)=>{
    try{
        legalObject = await LegalObject.findById(legalObject)
            .select('name')
            .lean()
        let res = await axios.post(`${!production||legalObject.name==='Test113 ОсОО Архикойн'?urlTest:url}/api/service-api/cash-register/shift/close`, {fnNumber: fn},
            {
                timeout: 30000,
                headers: !production||legalObject.name==='Test113 ОсОО Архикойн'?headersTest:headers
            })
        await Report.updateOne({_id: report}, {
            sync: !!(res.data.fields&&res.data.operatorResponse&&!res.data.operatorResponse.fields[1210]),
            syncMsg: JSON.stringify(res.data),
            syncData: JSON.stringify(res.data)
        })
    } catch (err) {
        console.error(err.response?err.response.data:err)
        await Report.updateOne({_id: report}, {
            sync: false,
            syncMsg: JSON.stringify(err.response?err.response.data:err)
        })
    }
};

module.exports.sendReceipt = async (sale)=>{
    try{
        sale = await Sale.findById(sale)
            .populate({
                path: 'cashbox',
                select: 'fn'
            })
            .populate({
                path: 'branch',
                select: 'calcItemAttributeCode_v2'
            })
            .populate({
                path: 'legalObject',
                select: 'taxSystemCode_v2 inn ndsTypeCode_v2 nspTypeCode_v2 name'
            })
            .populate({
                path: 'sale',
                select: 'syncData'
            })
        let json = {
            uuid: sale._id.toString(),
            fnNumber: sale.cashbox.fn,
            goods: [],
            taxSums: [
                {
                    code: sale.legalObject.nspTypeCode_v2,
                    sum: checkInt(sale.nsp*100),
                    type:  'ST'
                },
                {
                    code: sale.legalObject.ndsTypeCode_v2,
                    sum: checkInt(sale.nds*100),
                    type: 'VAT'
                }
            ],
            taxSystem: sale.legalObject.taxSystemCode_v2,
            totalCashSum: sale.typePayment==='Наличными'?checkInt(sale.amountEnd*100):0,
            totalCashlessSum: sale.typePayment!=='Наличными'?checkInt(sale.amountEnd*100):0,
            totalSum: checkInt(sale.amountEnd*100),
            operation:  receiptTypes[sale.type]
        }
        if(sale.sale&&sale.sale.syncData) {
            let syncData = JSON.parse(sale.sale.syncData)
            json.originFnSerialNumber = syncData.fields[1041]
            json.originFdNumber = syncData.fields[1040]
        }
        for(let i=0; i<sale.items.length; i++) {
            json.goods.push({
                calcItemAttributeCode: sale.branch.calcItemAttributeCode_v2,
                cost: checkInt(sale.items[i].amountEnd*100),
                name: sale.items[i].name,
                price: checkInt((sale.items[i].amountEnd/sale.items[i].count)*100),
                quantity: sale.items[i].count,
                st: sale.legalObject.nspTypeCode_v2,
                vat: sale.legalObject.ndsTypeCode_v2
            })
        }

        let res = await axios.post(`${!production||sale.legalObject.name==='Test113 ОсОО Архикойн'?urlTest:url}/api/service-api/cash-register/receipt`, json,
            {
                timeout: 30000,
                headers: !production||sale.legalObject.name==='Test113 ОсОО Архикойн'?headersTest:headers
            })
        let qr
        if(res.data.fields) {
            let date = res.data.fields[1012].replace('KGT ', '')
            date = new Date(date)
            date = `${date.getFullYear()}${date.getMonth()<9?'0':''}${date.getMonth()+1}${date.getDate()<10?'0':''}${date.getDate()}T${date.getHours()<10?'0':''}${date.getHours()}${date.getMinutes()<10?'0':''}${date.getMinutes()}${date.getSeconds()<10?'0':''}${date.getSeconds()}`
            qr = `${!production||sale.legalObject.name==='Test113 ОсОО Архикойн'?urlQRTest:urlQR}/tax-web-control/client/api/v1/ticket?date=${date}&type=3&operation_type=${res.data.fields[1054]}&fn_number=${res.data.fields[1041]}&fd_number=${res.data.fields[1040]}&fm=${parseInt(res.data.fields[1077], 16)}&tin=${sale.legalObject.inn}&regNumber=${res.data.fields[1037]}&sum=${res.data.fields[1020]}`

            sale.qrURL = qr

            qr = await QRCode.toDataURL(
                qr,
                {
                    errorCorrectionLevel: 'L',
                }
            )
        }
        sale.syncData = JSON.stringify(res.data)
        sale.syncMsg = JSON.stringify(res.data)
        sale.qr = qr
        sale.sync = !!(res.data.fields&&res.data.operatorResponse&&!res.data.operatorResponse.fields[1210])
        await sale.save()

    } catch (err) {
        console.error(err.response?err.response.data:err)
        sale.syncMsg = JSON.stringify(err.response?err.response.data:err)
        sale.sync = false
        await sale.save()
    }
};

module.exports.getTaxSystems = async ()=>{
    try{
        let res = await axios.get(`${!production?urlTest:url}/api/info/tax-systems`)
        res = !res.data[0]?[]:res.data
        let list = []
        for(let i=0; i<res.length; i++) {
            list.push({
                code: res[i].code,
                name: res[i].taxName
            })
        }
        return list
    } catch (err) {
        console.error(err.response?err.response.data:err)
        return []
    }
};

module.exports.getTaxRates = async ()=>{
    try{
        let res = await axios.get(`${!production?urlTest:url}/api/info/tax-rates`)
        res = !res.data[0]?[]:res.data
        let list = []
        for(let i=0; i<res.length; i++) {
            list.push({
                code: res[i].code,
                name: res[i].taxName
            })
        }
        return list
    } catch (err) {
        console.error(err.response?err.response.data:err)
        return []
    }
};

module.exports.getNdsTypes = async ()=>{
    try{
        let res = await axios.get(`${!production?urlTest:url}/api/info/tax-rates`)
        res = !res.data[0]?[]:res.data
        let list = []
        for(let i=0; i<res.length; i++) {
            if(res[i].taxRateType==='VAT')
                list.push({
                    code: res[i].code,
                    name: res[i].taxRateValue
                })
        }
        return list
    } catch (err) {
        console.error(err.response?err.response.data:err)
        return []
    }
};

module.exports.getNspTypes = async ()=>{
    try{
        let res = await axios.get(`${!production?urlTest:url}/api/info/tax-rates`)
        res = !res.data[0]?[]:res.data
        let nspTypes = []
        for(let i=0; i<res.length; i++) {
            if(res[i].taxRateType==='ST')
                nspTypes.push({
                    code: res[i].code,
                    name: res[i].taxRateValue
                })
        }
        return nspTypes
    } catch (err) {
        console.error(err.response?err.response.data:err)
        return []
    }
};

module.exports.getBusinessActivities = async ()=>{
    try{
        let res = await axios.get(`${!production?urlTest:url}/api/info/business-activities`)
        res = !res.data[0]?[]:res.data
        let list = []
        for(let i=0; i<res.length; i++) {
            list.push({
                code: res[i].code,
                name: res[i].name
            })
        }
        return list
    } catch (err) {
        console.error(err.response?err.response.data:err)
        return []
    }
};

module.exports.getEntrepreneurshipObjects = async ()=>{
    try{
        let res = await axios.get(`${!production?urlTest:url}/api/info/entrepreneurship-objects`)
        res = !res.data[0]?[]:res.data
        let list = []
        for(let i=0; i<res.length; i++) {
            list.push({
                code: res[i].code,
                name: res[i].name
            })
        }
        return list
    } catch (err) {
        console.error(err.response?err.response.data:err)
        return []
    }
};

module.exports.getTaxAuthorityDepartments = async ()=>{
    try{
        let res = await axios.get(`${!production?urlTest:url}/api/info/tax-authority-departments`)
        res = !res.data[0]?[]:res.data
        let list = []
        for(let i=0; i<res.length; i++) {
            list.push({
                code: res[i].code,
                name: res[i].name
            })
        }
        return list
    } catch (err) {
        console.error(err.response?err.response.data:err)
        return []
    }
};

module.exports.getCalcItemAttributes = async ()=>{
    try{
        let res = await axios.get(`${!production?urlTest:url}/api/info/calc-item-attributes`)
        res = !res.data[0]?[]:res.data
        let list = []
        for(let i=0; i<res.length; i++) {
            list.push({
                code: res[i].code,
                name: res[i].attributeName
            })
        }
        return list
    } catch (err) {
        console.error(err.response?err.response.data:err)
        return []
    }
};
