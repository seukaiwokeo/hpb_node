const axios = require('axios');
const { body, validationResult } = require('express-validator');
const ConfigHelper = require('../helpers/ConfigHelper');
const pbProducts = require('../models/pbProducts');
const pbPayments = require('../models/pbPayments');
const pbProcessQueue = require('../models/pbProcessQueue');
const { beginTransaction, commit, rollback } = require('../config/database');
const logger = require('../config/logger');

class HyperPayController {
    async pay(req, res) {
        const configs = ConfigHelper.all();
        const accountId = req.body?.account_id?.trim() ?? null;
        const userId = req.body?.user_id?.trim() ?? null;
        const productId = parseInt(req.body?.product_id?.trim()) ?? null;
        const callback = req.body?.callback ?? null;

        if (!accountId) {
            return res.json({
                success: false,
                message: 'Account id is required.'
            });
        }

        if (!/^[a-zA-Z0-9]+$/.test(accountId)) {
            return res.json({
                success: false,
                message: 'Account ID must be alphanumeric (a-z, A-Z, 0-9).'
            });
        }

        if (userId && !/^[a-zA-Z0-9]+$/.test(userId)) {
            return res.json({
                success: false,
                message: 'User ID must be alphanumeric (a-z, A-Z, 0-9).'
            });
        }

        if (!productId || !(Number.isSafeInteger(productId) && productId > 0)) {
            return res.json({
                success: false,
                message: 'product_id is required and must be a positive integer.'
            });
        }

        try {
            const connection = await beginTransaction();

            const product = await pbProducts.find(connection, productId);
            if (!product) {
                await rollback(connection);
                return res.json({
                    success: false,
                    message: 'Product not found.'
                });
            }

            try {
                const response = await axios.post(
                    `https://${configs.hyper_api_base}/PaymentBridge/create-link`,
                    {
                        iFrame: 1,
                        OrderID: accountId,
                        NotifyURL: `${configs.app_url}/api/notify`,
                        ProductID: String(product.product_id),
                        ProductName: `${configs.app_name} - ${product.product_name}`,
                        TotalAmount: parseFloat(product.price),
                        ProductImage: product.product_image
                    },
                    {
                        headers: {
                            'Apikey': configs.hyper_api_key,
                            'Content-Type': 'application/json',
                            'H-Region-Code': 'TR'
                        }
                    }
                );

                if (response.data.success !== true) {
                    await rollback(connection);
                    return res.json({
                        success: false,
                        message: 'Payment failed.'
                    });
                }

                const payData = response.data.data;
                const inserted = await pbPayments.create(connection, {
                    payment_link_id: payData.paymentLinkID,
                    payment_link: payData.paymentUrl,
                    payment_guid: payData.paymentGuid,
                    account_id: accountId,
                    user_id: userId,
                    product_id: product.product_id,
                    amount: product.price
                });

                if (!inserted) {
                    await rollback(connection);
                    return res.json({
                        success: false,
                        message: 'Internal Error'
                    });
                }

                await commit(connection);

                if (callback) {
                    const jsonpResponse = `${callback}(${JSON.stringify(response.data)})`;
                    return res.set('Content-Type', 'application/javascript').send(jsonpResponse);
                }

                return res.json(response.data);
            } catch (apiError) {
                await rollback(connection);
                logger.error('HyperPay API Error: ' + apiError.message);
                return res.json({
                    success: false,
                    message: 'Failed to connect HyperPay API.'
                });
            }
        } catch (error) {
            await rollback(connection);
            logger.error('Pay Error: ' + error.message);
            return res.status(500).json({
                success: false,
                message: 'Internal Server Error'
            });
        }
    }

    async notifyCallback(req, res) {
        const configs = ConfigHelper.all();
        const apiKey = req.header('ApiKey');

        if (apiKey !== configs.hyper_api_key) {
            return res.json({
                success: false,
                message: 'Invalid ApiKey'
            });
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.json({
                success: false,
                message: errors.array()[0].msg
            });
        }

        const params = req.body;

        try {
            const connection = await beginTransaction();

            const productData = await pbProducts.find(connection, params.ProductID);
            if (!productData) {
                await rollback(connection);
                return res.json({
                    success: false,
                    message: `Invalid ProductID - ${params.ProductID}`
                });
            }

            const payment = await pbPayments.findByLinkID(connection, params.PaymentLinkID);
            if (!payment) {
                await rollback(connection);
                return res.json({
                    success: false,
                    message: `Invalid Payment Link - ${params.PaymentLinkID}`
                });
            }

            if (parseInt(payment.status) !== 0) {
                await rollback(connection);
                return res.json({
                    success: false,
                    message: `Notification already received Payment Link - ${params.PaymentLinkID}`
                });
            }

            const queueInsert = await pbProcessQueue.create(connection, {
                payment_id: payment.payment_id,
                account_id: payment.account_id,
                user_id: payment.user_id,
                game_value: productData.game_value
            });

            if (!queueInsert) {
                await rollback(connection);
                logger.error(`Queue insert error  - ${params.PaymentLinkID}`);
                return res.status(500).json({
                    success: false,
                    message: 'Internal Server Error'
                });
            }

            const paymentUpdate = await pbPayments.update(connection, payment.payment_id, {
                status: 1
            });

            if (!paymentUpdate) {
                await rollback(connection);
                logger.error(`Payment update error  - ${params.PaymentLinkID}`);
                return res.status(500).json({
                    success: false,
                    message: 'Internal Server Error'
                });
            }

            await commit(connection);
            return res.json({ success: true });
        } catch (error) {
            await rollback(connection);
            logger.error('Payment Callback Error: ' + error.message);
            return res.json({
                success: false,
                message: 'Internal Error'
            });
        }
    }
}

module.exports = new HyperPayController();
