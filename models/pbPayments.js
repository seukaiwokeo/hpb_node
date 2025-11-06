const Model = require('./Model');

class pbPayments extends Model {
    constructor() {
        super();
        this.table = 'pb_payments';
        this.primaryKey = 'payment_id';
        this.fillable = [
            'payment_link_id',
            'payment_link',
            'payment_guid',
            'product_id',
            'account_id',
            'user_id',
            'amount',
            'status'
        ];
    }

    async findByLinkID(connection, id) {
        return await this.whereFirst(connection, 'payment_link_id', id);
    }
}

module.exports = new pbPayments();
