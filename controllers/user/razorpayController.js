// const instance = require('../../config/razorpay')
const crypto = require('crypto');
const Razorpay = require('razorpay');
const cartModel = require('../../models/cartModel')
const userModel = require('../../models/userModel')
const addressModel = require('../../models/addressModel')
const couponModel = require('../../models/couponModel')
const orderModel = require('../../models/orderModel')
require('dotenv').config()

const instance = new Razorpay({
    key_id: 'rzp_test_i8191KFpq7S1w1', // Replace with Razorpay Test Key ID
    key_secret: 'TMve1HXwBuQV9AIrnOxghVE2' // Replace with Razorpay Test Key Secret
});


const createOrder = async  (req, res) => {
    try{
        
        const { userId } = req.session
        const { addressId, coupon } = req.body

        const findUserDetails = await userModel.findOne({ _id: userId })

        if(!findUserDetails){

            return console.log(" cant find user at place order...")
        }

        const findUserAddress = await addressModel.findOne( { userId : userId })

        if(!findUserAddress){

            return console.log(" cant find user address at place order...")
        }

       
        const checkAddress = findUserAddress.address.find( val => val.id === addressId )

        if (!checkAddress) {
            return console.log("Address not found");
        }

        const { id,number, street, city, state, pin, country} = checkAddress

        // console.log(id,number,street,city,state,pin,country)

        

        const products = await cartModel.findOne({userId: userId}).populate('items.productId')

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



        const options = {
            amount: totalAmount * 100,
            currency: 'INR',
            receipt: `order_rcptid_${Math.random() * 1000}`,
        };

        // const order = await razorpay.orders.create(options);
        // const razorpayOrder = await instance.orders.create(options)
        const razorpayOrder = await instance.orders.create(options)


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
            paymentMethod : 'Razor Pay',
            razorpayId : razorpayOrder.id,
            totalAmount : totalAmount ,
            orginalAmount:orginalAmount,
            status: 'Pending'
            
        })

        const saveOrder = await newOrder.save()

        // console.log(saveOrder)

        res.status(201).json({ success: true, order: razorpayOrder, orderId : saveOrder.id });

    }catch(error){


        console.log(error)
    }
}

const verifyPayment = async  (req, res) => {
    try {


        const { 
            razorpayPaymentId, 
            razorpayOrderId, 
            razorpaySignature, 
            addressId, 
            coupon,
        } = req.body;

        // const order = await orderModel.findById(razorpayOrderId).populate('products.product')
      

        const generatedSignature = crypto.createHmac('sha256', process.env.RAZOR_KEY_SECRET)
            .update(razorpayOrderId + '|' + razorpayPaymentId)
            .digest('hex');

        if (generatedSignature === razorpaySignature) {
            // Payment verified successfully
            console.log('Payment verified! Address:', addressId, 'Coupon:', coupon);
            
            // Save order details to DB or update status as needed

            res.status(200).json({ success: true, message: 'Payment verified successfully' });
        } else {
            res.status(400).json({ success: false, message: 'Invalid signature' });
        }
    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({ success: false, message: 'Payment verification failed' });
    }
}

module.exports = {
    createOrder,
    verifyPayment,
}