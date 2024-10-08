const orderModel = require('../../models/orderModel')
const userModel = require('../../models/userModel')
const productModel = require('../../models/productModel')
const addressModel = require('../../models/addressModel')
const cartModel = require('../../models/cartModel')

const placeOrder = async (req, res) => {

    try {

        // console.log(req.body)
        const { addressId } = req.body
        // console.log(addressId)

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

        const { id, street, city, state, pin, country} = checkedAddress
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

        const totalAmount = productsDetails.reduce((acc, val) => acc + (val.quantity * val.price), 0);


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
            status: 'Pending'
            
        })

        const saveOrder = await newOrder.save()
        console.log(saveOrder)
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

module.exports = {

    placeOrder,
    orderComplete
}