const Model = require('./Model');

class pbProducts extends Model {
    constructor() {
        super();
        this.table = 'pb_products';
        this.primaryKey = 'product_id';
        this.fillable = [
            'product_name',
            'product_image',
            'price'
        ];
    }
}

module.exports = new pbProducts();
