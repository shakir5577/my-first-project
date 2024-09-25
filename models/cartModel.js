const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        unique: true,
        required: true,
        ref: "myUsers"
    },
    items: [
        {
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "products",
                required: true
            },
            quantity: {
                type: Number
            },
            price: {
                type: Number,
                required: true
            }
        }
    ],
    totalprice: {
        type: Number
        
    }
});

const Cart = mongoose.model('Cart', cartSchema);
module.exports = Cart;
