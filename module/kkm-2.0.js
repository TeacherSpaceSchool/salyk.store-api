const LegalObject = require('../models/legalObject');
const Branch = require('../models/branch');
const Sale = require('../models/sale');
const Cashbox = require('../models/cashbox');
const axios = require('axios');
const {receiptTypes} = require('./kkm-2.0-catalog');
const production = (process.env.URL).trim()==='https://salyk.store'
const url = production?'http://92.62.72.170:30115':'http://92.62.72.170:30115'
const urlQR = production?'http://92.62.72.170:30105':'http://92.62.72.170:30105'
const QRCode = require('qrcode')
const {pdDDMMYYHHMM, checkFloat} = require('../module/const');
const CCRModel = production?'Salykstore':'CloudCR'
const CCRVersion = production?'1.0':'1'
const ApiKey = production?'':'Cur messor velum?'
const testInn = '00103201810134'
const headers = {
    'Content-Type': 'application/json',
    'CCRModel': CCRModel,
    'CCRVersion': CCRVersion,
    'Api-Key': ApiKey
}

const authLogin = async (_id)=>{
    let now = new Date()
    try{
        let legalObject = await LegalObject.findById(_id)
            .select('accessLogin accessPassword accessToken accessTokenTTL refreshToken refreshTokenTTL')
            .lean()
        let json = {
            login: legalObject.accessLogin,
            password: legalObject.accessPassword
        }
        let res, accessToken = legalObject.accessToken
        if(!legalObject.refreshTokenTTL||legalObject.refreshTokenTTL<now||legalObject.accessTokenTTL<now) {
            if (!legalObject.refreshTokenTTL||legalObject.refreshTokenTTL < now)
                res = await axios.post(`${url}/api/v2/cash-register/auth/login`, json, {headers})
            else
                res = await axios.post(`${url}/api/v2/cash-register/auth/refresh`, json, {headers: {
                    ...headers,
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
        let res = await axios.get(`${url}/api/info/preregister/${production?inn:testInn}`)
        return res.data
    } catch (err) {
        console.error(err.response?err.response.data:err)
        return null
    }
};

module.exports.reserveFn = async (legalObject)=>{
    try{
        legalObject = await LegalObject.findById(legalObject)
            .select('inn')
            .lean()
        let res = await axios.get(`${url}/api/service-api/fn/reserve/${production?legalObject.inn:testInn}`, {headers})
        return res.data.number?res.data:null
    } catch (err) {
        console.error(err.response?err.response.data:err)
        return null
    }
};

module.exports.getFnList = async (legalObject)=>{
    try{
        legalObject = await LegalObject.findById(legalObject)
            .select('inn')
            .lean()
        let res = await axios.get(`${url}/api/service-api/fn/list/${production?legalObject.inn:testInn}`, {headers})
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
            .select('inn')
            .lean()
        let res = await axios.delete(`${url}/api/service-api/fn/free?tin=${production?legalObject.inn:testInn}&fn=${fn}`, {headers})
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
                administrativeArea1: branch.locality,
                administrativeArea2: '',
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
        let res = await axios.post(`${url}/api/service-api/cash-register/registration`, json, {headers})
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
                administrativeArea1: branch.locality,
                administrativeArea2: '',
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
        let res = await axios.put(`${url}/api/service-api/cash-register/registration`, json, {headers})
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
        let res = await axios.delete(`${url}/api/service-api/cash-register/registration?fn=${fn}&uuid=${cashbox.toString()}`, {headers})
        await Cashbox.updateOne({_id: cashbox._id}, {
            $push: {syncData: ['deleteCashbox', JSON.stringify({date: new Date(), ...res.data})]},
            sync: !!res.data.operatorResponse,
            syncMsg: JSON.stringify(res.data),
            syncType: 'deleteCashbox'
        })
        return !!res.data.fnNumber
    } catch (err) {
        console.error(err.response?err.response.data:err)
        await Cashbox.updateOne({_id: cashbox._id}, {
            sync: false,
            syncMsg: JSON.stringify(err.response?err.response.data:err),
            syncType: 'deleteCashbox'
        })
        return false
    }
};

module.exports.getCashboxState = async (fn)=>{
    try{
        let res = await axios.get(`${url}/api/service-api/cash-register/state/${fn}`, {headers})
        return res.data.fiscalMemoryNumber?res.data:null
    } catch (err) {
        console.error(err.response?err.response.data:err)
        return []
    }
};

module.exports.openShift2 = async (fn)=>{
    try{
        let res = await axios.post(`${url}/api/service-api/cash-register/shift/open`, {fnNumber: fn}, {headers})
        return {
            sync: !!res.data.operatorResponse,
            syncMsg: JSON.stringify(res.data),
            syncData: JSON.stringify(res.data)
        }
    } catch (err) {
        console.error(err.response?err.response.data:err)
        return {
            sync: false,
            syncMsg: JSON.stringify(err.response?err.response.data:err)
        }
    }
};

module.exports.closeShift2 = async (fn)=>{
    try{
        let res = await axios.post(`${url}/api/service-api/cash-register/shift/close`, {fnNumber: fn}, {headers})
        return {
            sync: !!res.data.operatorResponse,
            syncMsg: JSON.stringify(res.data),
            syncData: JSON.stringify(res.data)
        }
    } catch (err) {
        console.error(err.response?err.response.data:err)
        return {
            sync: false,
            syncMsg: JSON.stringify(err.response?err.response.data:err)
        }
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
                select: 'taxSystem_v2 inn'
            })
        let json = {
            uuid: sale._id.toString(),
            fnNumber: sale.cashbox.fn,
            goods: [],
            taxSums: [
                {
                    sum: sale.nsp,
                    type:  'ST'
                },
                {
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
                    st: checkFloat(sale.items[i].nsp),
                    vat: checkFloat(sale.items[i].nds)
                })
        }
        let res = await axios.post(`${url}/api/service-api/cash-register/receipt`, json, {headers})
        let qr
        if(res.data.fields) {
            let date = res.data.fields[1012].replace('KGT ', '')
            date = new Date(date)
            date = `${date.getFullYear()}${date.getMonth()<9?'0':''}${date.getMonth()+1}${date.getDate()<10?'0':''}${date.getDate()}T${date.getHours()<10?'0':''}${date.getHours()}${date.getMinutes()<10?'0':''}${date.getMinutes()}${date.getSeconds()<10?'0':''}${date.getSeconds()}`
            qr = `${urlQR}/tax-web-control/client/api/v1/ticket?date=${date}&type=3&operation_type=${res.data.fields[1054]}&fn_number=${res.data.fields[1041]}&fd_number=${res.data.fields[1040]}&fm=${parseInt(res.data.fields[1077], 16)}&tin=${sale.legalObject.inn}&regNumber=${res.data.fields[1037]}&sum=${res.data.fields[1020]}`
            qr = await QRCode.toDataURL(qr)
        }
        return {
            sync: !!(res.data.operatorResponse&&res.data.fields),
            syncMsg: JSON.stringify(res.data),
            qr,
            syncData: JSON.stringify(res.data)
        }
    } catch (err) {
        console.error(err.response?err.response.data:err)
        return {
            sync: false,
            syncMsg: JSON.stringify(err.response?err.response.data:err)
        }
    }
};