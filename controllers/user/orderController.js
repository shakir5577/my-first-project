const orderModel = require('../../models/orderModel')
const userModel = require('../../models/userModel')
const productModel = require('../../models/productModel')
const addressModel = require('../../models/addressModel')
const cartModel = require('../../models/cartModel')
const couponModel = require('../../models/couponModel')
const transactionModel = require('../../models/transactionSchema')

const placeOrder = async (req, res) => {

    try {

        // console.log(req.body)
        const { addressId } = req.body
        // console.log(addressId)
        const { coupon } = req.body

        if (!addressId) {
            return console.log("can't find address id")
        }

        const { userId } = req.session
        // console.log(userId)

        const findUserDetails = await userModel.findOne({ _id: userId })
        // console.log(findUserDetails)

        if (!findUserDetails) {
            return console.log("cant't find user")
        }

        const findUserAddress = await addressModel.findOne({ userId: userId })
        // console.log(findUserAddress)

        if (!findUserAddress) {
            return console.log("can't find user address")
        }

        const checkedAddress = findUserAddress.address.find(val => val.id === addressId);
        // console.log(checkedAddress)

        if (!checkedAddress) {
            return console.log("Address not found");
        }

        const { id,number, street, city, state, pin, country} = checkedAddress
        // console.log(id,street,city,state,pin,country)

        const products = await cartModel.findOne({ userId: userId}).populate('items.productId')
        // console.log(products)

        if(!products){
            return console.log('cant find products')
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
            paymentMethod : 'cod',
            totalAmount : totalAmount ,
            orginalAmount:orginalAmount,
            status: 'Pending'
            
        })

        const saveOrder = await newOrder.save()
        // console.log("🚀 ~ placeOrder ~ saveOrder:", saveOrder)
        // console.log(saveOrder)
        // console.log(newOrder)

        if(saveOrder){
            res.send({success:true})
        }

        

    } catch (error) {
        console.log(error)
    }
}

const orderComplete = async (req,res) => {

    try{

        res.render('user/orderComplete')


    }catch(error){
        console.log(error)
    }
}

const cancelOrder = async(req,res) => {

    try{

        const { orderId } = req.body
        const { userId } = req.session

        if(!orderId){
            return res.status(400).send("order ID is required")
        }

        const findOrder = await orderModel.findById(orderId)

        if(!findOrder){
            return res.statud(400).send("order not found")
        }

        findOrder.status = 'Cancelled'

        for( const productOrder of findOrder.products) {
            productOrder.productStatus = 'Cancelled'

            //update the stock of the product

            const product = await productModel.findById(productOrder.product)
            if(product){
                product.stock += productOrder.quantity
                await product.save()

            }else{
                return res.status(404).send("product not found")
            }
        }

        const updateReturn = await findOrder.save()

        if( findOrder.paymentMethod === 'Razor Pay' || findOrder.paymentMethod === 'wallet'){

            const user = await userModel.findById(userId)
            user.balance += findOrder.totalAmount
            await user.save()

            const transaction = new transactionModel({
                userId : userId,
                amount : findOrder.totalAmount,
                type : 'credit'
            })

            await transaction.save()

            res.send({ success: 1, message: 'Order returned, balance credited, and stock updated'})
            
        } else if(updateReturn) {
            res.send({ success: 2, message: 'Order returned successfully and stock updated' })

        }else{
            res.send(500).send('failed to update order status')
        }
        
    }catch(error){
        console.log(error)
    }
}

module.exports = {

    placeOrder,
    orderComplete,
    cancelOrder
}