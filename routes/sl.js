const express = require('express');
const router = express.Router();
const ModelsError = require('../models/error');
const ShortLink = require('../models/shortLink');

router.get('/:id', async(req, res) => {
    try{
        const shortLink = await ShortLink.findById(req.params.id).select('link').lean()
        res.redirect(301, shortLink.link)
    } catch (err) {
        let _object = new ModelsError({
            err: err.message,
            path: 'sl'
        });
        await ModelsError.create(_object)
        console.error(err)
        res.status(500);
        res.end('error')
    }
});

module.exports = router;