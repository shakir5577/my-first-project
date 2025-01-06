const mongoose = require('mongoose')

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref : 'myUsers',
        required : true
    },
    products : [
        {
            product : {

                type: mongoose.Schema.Types.ObjectId,
                ref : 'products',
                required : true
            },
            name : { type: String, required: true},
            quantity : {type :Number, required: true },
            price : {type: Number , required : true},
            productStatus: {type: String},
            returnRequested: { type: Boolean, default: false },
            returnStatus: { type: String, default: 'None' },
            returnReason: { type: String}
        }
    ],
    shippingAddress : {

        name : {type: String, required: true},
        email : { type: String, required: true},
        number : {type: Number},
        address : {
            type : mongoose.Schema.Types.ObjectId,
            ref : 'usersAddress',
        },
        street : {type: String, required: true},
        city : {type: String, required: true},
        state : {type: String, required: true},
        pin : {type: Number, required: true},
        country : {type: String, required: true}
    },

    paymentMethod : {type: String},
    razorpayId : { type: String},
    totalAmount : {type: Number, required:true},
    orginalAmount : { type: Number, required:true},
    status: {type: String},
    date: {type: Date, default: Date.now }
    
})

const order = mongoose.model('orders', orderSchema)
module.exports = order