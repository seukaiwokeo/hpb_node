require('dotenv').config();

class ConfigHelper {
    constructor() {
        this.configs = {
            hyper_api_key: process.env.HYPER_API_KEY || '',
            hyper_api_base: process.env.HYPER_API_BASE || '',
            app_name: process.env.APP_NAME || 'HPB Node',
            app_url: process.env.APP_URL || 'http://localhost:3000'
        };
    }

    all() {
        return this.configs;
    }

    get(key, defaultValue = null) {
        return this.configs[key] || defaultValue;
    }

    set(key, value) {
        this.configs[key] = value;
    }

    update(configs) {
        this.configs = { ...this.configs, ...configs };
    }
}

module.exports = new ConfigHelper();
