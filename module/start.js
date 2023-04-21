const { createAdmin } = require('./user');
const { createTestLegalObject } = require('./legalObject');
const { Worker, isMainThread } = require('worker_threads');
const { syncKKM } = require('../thread/syncKKM');
const {reductionItems} = require('../module/item');
const SyncKKM = require('../models/syncKKM');

let startResetUnloading = async () => {
    if(isMainThread) {
        let w = new Worker('./thread/resetUnloading.js', {workerData: 0});
        w.on('message', (msg) => {
            console.log('ResetUnloading: '+msg);
        })
        w.on('error', console.error);
        w.on('exit', (code) => {
            if(code !== 0)
                console.error(new Error(`ResetUnloading stopped with exit code ${code}`))
        });
        console.log('ResetUnloading '+w.threadId+ ' run')
    }
}

let startSyncKKM = async () => {
    if(isMainThread) {
        let w = new Worker('./thread/syncKKM.js', {workerData: 0});
        w.on('message', (msg) => {
            console.log('SyncKKM: '+msg);
        })
        w.on('error', console.error);
        w.on('exit', (code) => {
            if(code !== 0)
                console.error(new Error(`SyncKKM stopped with exit code ${code}`))
        });
        console.log('SyncKKM '+w.threadId+ ' run')
    }
}

let start = async () => {
    await createTestLegalObject();
    await createAdmin();
    await startResetUnloading()
    await reductionItems()
    console.log(await SyncKKM.deleteMany({end: null}))
    if((process.env.URL).trim()!=='http://localhost') {
        await startSyncKKM()
        await syncKKM()
    }
}

module.exports.start = start;
