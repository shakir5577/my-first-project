const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        unique: true,
        ref: 'myUsers'
    },
    items: [{
        productId: {type: mongoose.Schema.Types.ObjectId, ref:'products'}}],
        createdAt: {
            type: Date,
            default: Date.now
        }
})

const wishlist = mongoose.model('wishlist', wishlistSchema)
module.exports = wishlist