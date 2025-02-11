const mongoose = require('mongoose')


const transcationSchema = new mongoose.Schema({
    userId: { type: String, required: true},
    amount: { type: Number, required: true},
    type: { type: String, enum: [ 'credit','debit','refferal'], required: true},
    date: {type: Date, default: Date.now },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'orders' }
})

const transaction = mongoose.model('transaction',transcationSchema)

module.exports = transaction