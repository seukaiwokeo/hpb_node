require('dotenv').config();
const express = require('express');
const logger = require('./config/logger');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path} - IP: ${req.ip}`);
    next();
});

app.use('/api', apiRoutes);

app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Hyper Payment Bridge Node Server',
        version: '1.0.0',
        endpoints: {
            health: '/api/health',
            pay: '/api/pay',
            callback: '/api/notify'
        }
    });
});

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found'
    });
});

app.use((err, req, res, next) => {
    logger.error(`Error: ${err.message}`);
    res.status(500).json({
        success: false,
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`\n= Server started on http://localhost:${PORT}`);
    console.log(`= API Documentation: http://localhost:${PORT}/api/health\n`);
});

process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received: closing HTTP server');
    app.close(() => {
        logger.info('HTTP server closed');
    });
});

module.exports = app;
