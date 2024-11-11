

const mongoose = require('mongoose')

const productSchema = new mongoose.Schema({

    productName: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: { type: String, riquired: true },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    images: [String],
    isBlock: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    offers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'offer'}]

})

const products = mongoose.model('products', productSchema)
module.exports = products;