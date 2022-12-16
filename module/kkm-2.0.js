const LegalObject = require('../models/legalObject');
const Branch = require('../models/branch');
const Sale = require('../models/sale');
const Cashbox = require('../models/cashbox');
const WorkShift = require('../models/workshift');
const Report = require('../models/report');
const ShortLink = require('../models/shortLink');
const axios = require('axios');
const {receiptTypes} = require('./kkm-2.0-catalog');
const production = process.env.URL.trim()==='https://salyk.store'
const urlTest = 'http://92.62.72.170:30115'
const url = 'http://92.62.72.170:30115'
const urlQRTest = 'http://92.62.72.170:30105'
const urlQR = 'http://92.62.72.170:30105'
const QRCode = require('qrcode')
const {pdDDMMYYHHMM, checkFloat, urlMain} = require('../module/const');
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

const authLogin = async (_id)=>{
    let now = new Date()
    try{
        let legalObject = await LegalObject.findById(_id)
            .select('name accessLogin accessPassword accessToken accessTokenTTL refreshToken refreshTokenTTL')
            .lean()
        let json = {
            login: legalObject.accessLogin,
            password: legalObject.accessPassword
        }
        let res, accessToken = legalObject.accessToken
        if(!legalObject.refreshTokenTTL||legalObject.refreshTokenTTL<now||legalObject.accessTokenTTL<now) {
            if (!legalObject.refreshTokenTTL||legalObject.refreshTokenTTL < now)
                res = await axios.post(`${!production||legalObject.name==='Test113 ОсОО Архикойн'?urlTest:url}/api/v2/cash-register/auth/login`, json,
                    {headers: !production||legalObject.name==='Test113 ОсОО Архикойн'?headersTest:headers})
            else
                res = await axios.post(`${!production||legalObject.name==='Test113 ОсОО Архикойн'?urlTest:url}/api/v2/cash-register/auth/refresh`, json, {headers: {
                    ...!production||legalObject.name==='Test113 ОсОО Архикойн'?headersTest:headers,
                    'Refresh-Token': legalObject.refreshToken
                }})
            await LegalObject.updateOne({_id}, {
                accessToken: res.data.accessToken,
                accessTokenTTL: new Date(res.data.accessTokenTTL),
                refreshToken: res.data.refreshToken,
                refreshTokenTTL: new Date(res.data.refreshTokenTTL),
                sync: true,
                syncMsg: `${pdDDMMYYHHMM(now)} ${JSON.stringify(res.data)}`
            })
            accessToken = res.data.accessToken
        }
        return accessToken
    } catch (err) {
        console.error(err)
        await LegalObject.updateOne({_id}, {
            accessToken: null,
            accessTokenTTL: null,
            refreshToken: null,
            refreshTokenTTL: null,
            sync: false,
            syncMsg: `${pdDDMMYYHHMM(now)}\n${err.response?JSON.stringify(err.response.data):err.message?err.message:err.errno}`
        })
        return null
    }
};

module.exports.authLogin = authLogin

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
                branch.calcItemAttribute
            ],
            taxSystems: [
                legalObject.taxSystem_v2
            ],
            serialNumber: 'SS000001',
            version: '1',
            storeName: branch.name,
            entrepreneurshipObject: branch.pType_v2===62?999:branch.pType_v2,
            businessActivity: branch.bType_v2===105?999:branch.bType_v2,
            taxAuthorityDepartment: branch.ugns_v2
        }
        let res = await axios.post(`${!production||legalObject.name==='Test113 ОсОО Архикойн'?urlTest:url}/api/service-api/cash-register/registration`, json,
            {headers: !production||legalObject.name==='Test113 ОсОО Архикойн'?headersTest:headers})
        return JSON.stringify(res.data)
    } catch (err) {
        console.error(err.response?err.response.data:err)
        return JSON.stringify(err.response?err.response.data:err)
    }
};

module.exports.reregisterCashbox = async (cashbox)=>{
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
            calcItemAttributes: branch.calcItemAttributes,
            taxSystems: [
                legalObject.taxSystem_v2
            ],
            storeName: branch.name,
            updateReasons: [
                0
            ],
            entrepreneurshipObject: branch.pType_v2===62?999:branch.pType_v2,
            businessActivity: branch.bType_v2===105?999:branch.bType_v2,
            taxAuthorityDepartment: branch.ugns_v2
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
                select: 'calcItemAttribute'
            })
            .populate({
                path: 'legalObject',
                select: 'taxSystem_v2 inn ndsType_v2 nspType_v2 name'
            })
        let json = {
            uuid: sale._id.toString(),
            fnNumber: sale.cashbox.fn,
            goods: [],
            taxSums: [
                {
                    code: sale.typePayment==='Безналичный'?0:sale.legalObject.nspType_v2,
                    sum: sale.nsp,
                    type:  'ST'
                },
                {
                    code: sale.legalObject.ndsType_v2,
                    sum: sale.nds,
                    type: 'VAT'
                }
            ],
            taxSystem: sale.legalObject.taxSystem_v2,
            totalCashSum: sale.typePayment==='Наличными'?sale.amountEnd:0,
            totalCashlessSum: sale.typePayment!=='Наличными'?sale.amountEnd:0,
            totalSum: sale.amountEnd,
            operation:  receiptTypes[sale.type]
        }
        for(let i=0; i<sale.items.length; i++) {
            json.goods.push({
                    calcItemAttributeCode: sale.branch.calcItemAttribute,
                    cost: sale.items[i].amountEnd,
                    name: sale.items[i].name,
                    price: checkFloat(sale.items[i].amountEnd/sale.items[i].count),
                    quantity: sale.items[i].count,
                    st: sale.legalObject.nspType_v2,
                    vat: sale.legalObject.ndsType_v2
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
/*
            let shortLink = new ShortLink({
                link: qr
            });
            await ShortLink.create(shortLink)
            qr = `${urlMain}/sl/${shortLink._id.toString()}`
*/
            qr = await QRCode.toDataURL(
                qr,
                {errorCorrectionLevel: 'H'}
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
