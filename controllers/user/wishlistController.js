const mongoose = require("mongoose")
const userModel = require("../../models/userModel")
const wishlistModel = require("../../models/wishlistModel")
const productModel = require("../../models/productModel")


const loadWishlist = async (req,res) => {

    try{

        const { userId } = req.session
        // console.log(userId)

        const wishlist = await wishlistModel.findOne({userId:userId}).populate('items.productId')
        // console.log(wishlist)

        if (!wishlist) {
            return res.render('user/wishlist', { wishlist: null, message: 'Your wishlist is empty' })
        }

        res.render('user/wishlist',{wishlist:wishlist})

    }catch(error){
        console.log(error)
    }
}

const addToWishlist = async (req,res) => {

    try{

        const {userId} = req.session
        // console.log(userId)

        const {productId} = req.body
        // console.log(productId)

        let wishlist = await wishlistModel.findOne({ userId })
        // console.log(wishlist)

        if(!wishlist){

            wishlist = new wishlistModel({

                userId,
                items : [],
            })

            // console.log(wishlist)
        }

        const product = await productModel.findById(productId)
        // console.log(product)

        if (!product) {

            return res.status(404).json({ success: false, message: 'product not found' })
        }

        const existingProduct = wishlist.items.findIndex(item => item.productId.equals(productId))
        if( existingProduct >= 0){

            return res.json({
                success: true,
                alReadyInWishlist: true
            })

        }else{

            wishlist.items.push({

                productId : productId,
                price : product.price
            })
        }

        const saving = await wishlist.save()
        // console.log(saving)
        if(saving){
            console.log("add to wishlist successfully...")

            res.json({

                success : true,
                product : {
                    name : product.productName,
                    image : product.images[0]
                }
            })
        }

    }catch(error){
        console.log('Error:', error)
        res.status(500).json({ success: false, message: 'Error adding product to wishlist' })
    }
}

const removeFromWishlist = async (req,res) => {

    try{

        const {userId} = req.session
        // console.log(userId)
        const {id} = req.body
        // console.log(id)

        const updateWishlist = await wishlistModel.updateOne(
            { userId : userId },
            {
                $pull: { items: { productId: id } }
            }
        )

        res.json({ success: true, message: 'Product removed from wishlist' })

    }catch(error){
        console.log(error)
    }
}

module.exports = {

    loadWishlist,
    addToWishlist,
    removeFromWishlist
}