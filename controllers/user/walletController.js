const userModel = require('../../models/userModel')
const transactionModel = require('../../models/transactionSchema')
const orderModel = require('../../models/orderModel')
const productModel = require('../../models/productModel')
const addressModel = require('../../models/addressModel')
const cartModel = require('../../models/cartModel')
const couponModel = require('../../models/couponModel')

const loadWallet = async (req,res) => {

    try{

        const { userId } = req.session

        if(!userId){
            console.log("cant find userid at loadWallet")
        }

        const fetchUser = await userModel.findById(userId)
        // console.log(fetchUser)

        if(!fetchUser){
            console.log("user not find...")
        }

        const transactions = await transactionModel.find({ userId : userId }).sort({ createdAt: -1 })
        // console.log(transactions)


        
        res.render('user/wallet',{transactions:transactions,user:fetchUser})

    }catch(error){
        console.log(error)
    }
}

const loadmyAccountWallet = async (req,res) => {

    try{

        const {userId} = req.session

        const findUserDetails = await userModel.findOne({ _id: userId })
        // console.log(findUserDetails)

        res.render('user/myAccountWallet',{userDetails: findUserDetails})

    }catch(error){
        console.log(error)
    }
}

const orderWithWallet = async (req,res) => {

    try{

        const { addressId, coupon} = req.body

        const { userId } = req.session

        if(!addressId){
            console.log("cant find addressId")
        }

        if(! coupon){
            console.log("cant find coupon in wallet palceorder")
        }

        if(!userId){
            console.log("cant find user")
        }

        const findUserDetails = await userModel.findOne({ _id: userId})
        // console.log(findUserDetails)

        if(!findUserDetails){
            console.log("cant find user")
        }

        const findAddress = await addressModel.findOne({ userId : userId})
        // console.log(findAddress)

        if(!findAddress){
            console.log("cant find user address")
        }

        const checkedAddress = findAddress.address.find(val => val.id === addressId);

        const { id,number, street, city, state, pin, country} = checkedAddress

        const products = await cartModel.findOne({ userId : userId}).populate('items.productId')
        // console.log(products)

        if(!products){
            console.log("cant find products")
        }

        const productsDetails = products.items.map(val => ({
            product: val.productId.id,
            name: val.productId.productName,
            quantity: val.quantity,
            price: val.productId.price,
            productStatus: 'Pending'
        }));

        let totalAmount = productsDetails.reduce((acc, val) => acc + (val.quantity * val.price), 0);
        let orginalAmount = productsDetails.reduce((acc, val) => acc + (val.quantity * val.price), 0);

        if(coupon.length > 0) {

            const fetchCoupon = await couponModel.findOne({ code: coupon })

            if(!fetchCoupon) {

                return console.log('cant find coupon, maybe code is invalid')
            }

            totalAmount -= fetchCoupon.discountAmount

            fetchCoupon.userList.push({ userId })
            
            await fetchCoupon.save()
        }

        if( totalAmount > findUserDetails.balance){
            console.log("insufficient balance in wallet")
            return res.send({ error: "insufficient balance"})
        }

        for( let item of productsDetails) {

            const product = await productModel.findOne({ _id: item.product})

            if(!product){
                console.log("cant find products")
            }

            if(product.stock < item.quantity) {
                res.send({ error : true})
               return console.log('product dont have enough quantity')
            }


        }

        const newOrder = new orderModel({
            user : userId,
            products :  productsDetails,
            shippingAddress : {
                name : findUserDetails.name,
                email : findUserDetails.email,
                number : findUserDetails.number,
                address : id,
                street : street,
                city : city,
                state : state,
                pin : pin,
                country : country
                

            },
            paymentMethod : 'wallet',
            totalAmount : totalAmount ,
            orginalAmount:orginalAmount,
            status: 'Pending'
            
        })

        const saveOrder = await newOrder.save()
        if(saveOrder){

            for( let item of productsDetails) {

                const product = await productModel.findOne({ _id: item.product })

                if(!product){
                    return console.log('product not found')
                }

                product.stock -= item.quantity
                await product.save()

            }

            findUserDetails.balance -= totalAmount

            await findUserDetails.save()

            products.items = []

            await products.save()

            const transaction = new transactionModel({
                userId: userId,
                amount: totalAmount,
                type: 'debit'
            })

            await transaction.save()

            console.log("order success...")
            res.send({ success: true, orderId: saveOrder.id})

        }else{

            return console.log("order placing failed")
        }

    }catch(error){
        console.log(error)
    }
}

module.exports = {

    loadWallet,
    loadmyAccountWallet,
    orderWithWallet
}