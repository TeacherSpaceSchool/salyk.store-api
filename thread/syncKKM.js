const { isMainThread } = require('worker_threads');
const connectDB = require('../models/index');
const cron = require('node-cron');
const SyncKKM = require('../models/syncKKM');
const Cashbox = require('../models/cashbox');
const WorkShift = require('../models/workshift');
const Sale = require('../models/sale');
const Report = require('../models/report');
const {registerKkm, openShift, check, zReport} = require('../module/kkm');
const {pdKKM} = require('../module/const');
const {sendReceipt, openShift2, closeShift2, registerCashbox, reregisterCashbox, deleteCashbox, getCashboxState} = require('../module/kkm-2.0');

connectDB.connect();
if(!isMainThread) {
    cron.schedule('10 * * * *', async() => {
        if(!(await SyncKKM.findOne({end: null}).select('_id').lean())){
            let date = new Date()
            let sync
            if(date.getDay()===0) {
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
            let dateEnd = new Date()
            dateEnd.setMinutes(dateEnd.getMinutes()-10)
            let dateStart = new Date()
            dateStart.setMonth(11)
            dateStart.setDate(1)
            dateStart.setYear(2021)
            let cashboxes = await Cashbox.find({
                sync: {$ne: true},
                $and: [{createdAt: {$gt: dateStart}}, {createdAt: {$lte: dateEnd}}]
            })
                .populate({
                    path: 'branch',
                    select: 'uniqueId'
                })
            if((process.env.URL).trim()==='http://localhost')
                console.log('cashboxes', cashboxes.length)
            syncKKM.cashboxes = cashboxes.length
            for(let i=0; i<cashboxes.length; i++){
                if(cashboxes[i].fn) {
                    if(cashboxes[i].syncType==='registerCashbox') {
                        let sync = await registerCashbox(cashboxes[i].branch, cashboxes[i]._id, cashboxes[i].fn)
                        cashboxes[i].syncMsg = sync
                        if(sync.sync) {
                            setTimeout(async()=>{
                                try {
                                    let sync = await getCashboxState(cashboxes[i].fn)
                                    if(sync&&sync.fnExpiresAt)
                                        await Cashbox.updateOne({_id: cashboxes[i]._id}, {
                                            sync: true,
                                            fnExpiresAt: new Date(sync.fnExpiresAt),
                                            registrationNumber: sync.registrationNumber
                                        })
                                } catch (err) {
                                    console.error('setTimeout')
                                }
                            }, 30000)
                        }
                    }
                    else if(cashboxes[i].syncType==='reregisterCashbox')
                        await reregisterCashbox(cashboxes[i])
                    else if(cashboxes[i].syncType==='deleteCashbox')
                        await deleteCashbox(cashboxes[i]._id, cashboxes[i].fn)
                }
                else if(cashboxes[i].rnmNumber) {
                    if (cashboxes[i].branch.uniqueId) {
                        let sync = await registerKkm({
                            spId: cashboxes[i].branch.uniqueId,
                            name: cashboxes[i].name,
                            number: cashboxes[i]._id.toString(),
                            regType: cashboxes[i].del ? '3' : !cashboxes[i].rnmNumber ? '1' : '2',
                            rnmNumber: cashboxes[i].rnmNumber
                        })
                        cashboxes[i].sync = sync.sync
                        cashboxes[i].syncMsg = sync.syncMsg
                        if (sync.rnmNumber && !cashboxes[i].rnmNumber) cashboxes[i].rnmNumber = sync.rnmNumber
                    }
                    else {
                        cashboxes[i].sync = false
                        cashboxes[i].syncMsg = 'Нет uniqueId'
                    }
                }
                await cashboxes[i].save()
                if((process.env.URL).trim()==='http://localhost')
                    console.log('cashbox', i+1)
            }
            let workShifts = await WorkShift.find({
                sync: {$ne: true},
                syncMsg: {$ne: 'Фискальный режим отключен'},
                $and: [{createdAt: {$gt: dateStart}}, {createdAt: {$lte: dateEnd}}]
            })
                .select('_id cashbox number start')
                .populate({
                    path: 'cashbox',
                    select: 'rnmNumber fn'
                })
                .lean()
            if((process.env.URL).trim()==='http://localhost')
                console.log('workShifts', workShifts.length)
            syncKKM.workShifts = workShifts.length
            for(let i=0; i<workShifts.length; i++){
                if(workShifts[i].cashbox.fn) {
                    sync = await openShift2(workShifts[i].cashbox.fn)
                    await WorkShift.updateOne({_id: workShifts[i]._id}, {syncData: sync.syncData, sync: sync.sync, syncMsg: sync.syncMsg})
                }
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
                if(sales[i].cashbox.fn) {
                    let sync = await sendReceipt(sales[i]._id)
                    await Sale.updateOne({_id: sales[i]._id}, {syncData: sync.syncData, qr: sync.qr, sync: sync.sync, syncMsg: sync.syncMsg})
                }
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
                .select('_id workShift cashbox')
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
                    if(reports[i].cashbox.fn) {
                        let sync = await closeShift2(reports[i].cashbox.fn)
                        await Report.updateOne({_id: reports[i]._id}, {syncData: sync.syncData, sync: sync.sync, syncMsg: sync.syncMsg})
                    }
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
    });
}