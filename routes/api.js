const express = require('express');
const router = express.Router();
const HyperPayController = require('../controllers/HyperPayController');

router.post('/pay', (req, res) => HyperPayController.pay(req, res));
router.post('/notify', (req, res) => HyperPayController.notifyCallback(req, res));

router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'API is running',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
