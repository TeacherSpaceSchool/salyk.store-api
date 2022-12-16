const { isMainThread } = require('worker_threads');
const connectDB = require('../models/index');
const cron = require('node-cron');
const SyncKKM = require('../models/syncKKM');
const WorkShift = require('../models/workshift');
const Sale = require('../models/sale');
const Report = require('../models/report');
const {openShift, check, zReport} = require('../module/kkm');
const {pdKKM} = require('../module/const');
const {endWorkShift} = require('../graphql/workshift');
const {sendReceipt, openShift2, closeShift2} = require('../module/kkm-2.0');

connectDB.connect();

const syncKKM = async () => {
    if(!(await SyncKKM.findOne({end: null}).select('_id').lean())){
        let date = new Date()
        if(date.getDay()===0&&date.getHours()===3) {
            date.setDate(date.getDate() - 7)
            await SyncKKM.deleteMany({dateStart: {$lte: date}})
        }
        let syncKKM = new SyncKKM({
            cashboxes: 0,
            workShifts: 0,
            sales: 0,
            reports: 0
        });
        syncKKM = await SyncKKM.create(syncKKM)

        date = new Date()
        if(date.getHours()===3) {
            date.setDate(date.getDate() - 1)
            date.setMinutes(date.getMinutes() - 10)
            let expiredWorkShifts = await WorkShift.find({createdAt: {$lte: date}, end: null}).select('_id').lean()
            for(let i=0; i<expiredWorkShifts.length; i++) {
                await endWorkShift({_id: expiredWorkShifts[i]._id, user: {role: 'superadmin'}})
            }
        }

        let dateEnd = new Date()
        dateEnd.setMinutes(dateEnd.getMinutes()-10)
        let dateStart = new Date('2022-12-14')
        let workShifts = await WorkShift.find({
            sync: {$ne: true},
            syncMsg: {$ne: 'Фискальный режим отключен'},
            $and: [{createdAt: {$gt: dateStart}}, {createdAt: {$lte: dateEnd}}]
        })
            .select('_id cashbox number start legalObject')
            .populate({
                path: 'cashbox',
                select: 'rnmNumber fn'
            })
            .lean()
        if((process.env.URL).trim()==='http://localhost')
            console.log('workShifts', workShifts.length)
        syncKKM.workShifts = workShifts.length
        for(let i=0; i<workShifts.length; i++){
            if(workShifts[i].cashbox.fn)
                await openShift2(
                    workShifts[i].cashbox.fn,
                    workShifts[i].legalObject,
                    workShifts[i]._id
                )
            else {
                await openShift({
                    workShift: workShifts[i]._id,
                    rnmNumber: workShifts[i].cashbox.rnmNumber,
                    number: workShifts[i].number,
                    date: pdKKM(workShifts[i].start)
                })
            }
            if((process.env.URL).trim()==='http://localhost')
                console.log('workShift', i+1)
        }
        let sales = await Sale.find({
            sync: {$ne: true},
            syncMsg: {$ne: 'Фискальный режим отключен'},
            $and: [{createdAt: {$gt: dateStart}}, {createdAt: {$lte: dateEnd}}]
        })
            .select('_id cashbox')
            .populate({
                path: 'cashbox',
                select: 'rnmNumber fn'
            }).lean()
        if((process.env.URL).trim()==='http://localhost')
            console.log('sales', sales.length)
        syncKKM.sales = sales.length
        for(let i=0; i<sales.length; i++){
            if(sales[i].cashbox.fn)
                await sendReceipt(sales[i]._id)
            else
                await check(sales[i]._id)
            if((process.env.URL).trim()==='http://localhost')
                console.log('sale', i+1)
        }
        let reports = await Report.find({
            sync: {$ne: true},
            syncMsg: {$ne: 'Фискальный режим отключен'},
            type: 'Z',
            $and: [{createdAt: {$gt: dateStart}}, {createdAt: {$lte: dateEnd}}]
        })
            .select('_id workShift cashbox legalObject')
            .populate({
                path: 'cashbox',
                select: 'rnmNumber fn'
            })
            .populate({
                path: 'workShift',
                select: 'sync'
            })
            .lean()
        if((process.env.URL).trim()==='http://localhost')
            console.log('reports', reports.length)
        syncKKM.reports = reports.length
        for(let i=0; i<reports.length; i++){
            if (reports[i].workShift.sync) {
                if(reports[i].cashbox.fn)
                    closeShift2(reports[i].cashbox.fn, reports[i].legalObject, reports[i]._id)
                else
                    zReport(reports[i]._id)
            }
            else
                await Report.updateOne({_id: reports[i]._id}, {sync: false, syncMsg: 'Смена не синхронизирована'})
            if((process.env.URL).trim()==='http://localhost')
                console.log('report', i+1)
        }
        syncKKM.end = new Date()
        await syncKKM.save()
    }
}

if(!isMainThread) {
    cron.schedule('10 * * * *', async() => {
        await syncKKM()
    });
}

module.exports.syncKKM = syncKKM