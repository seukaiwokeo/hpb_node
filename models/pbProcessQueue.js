const Model = require('./Model');

class pbProcessQueue extends Model {
    constructor() {
        super();
        this.table = 'pb_process_queue';
        this.primaryKey = 'process_queue_id';
        this.fillable = [
            'payment_id',
            'account_id',
            'user_id',
            'game_value',
            'is_processed'
        ];
    }
}

module.exports = new pbProcessQueue();
