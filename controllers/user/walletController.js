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

        const transactions = await transactionModel.find({ userId : userId }).sort({ date: -1 })
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
const orderWithWallet = async (req, res) => {
    try {
        const { addressId, coupon } = req.body;
        const { userId } = req.session;

        if (!addressId || !coupon || !userId) {
            console.log("Required data is missing.");
            return res.status(400).send({ error: "Invalid request data" });
        }

        const findUserDetails = await userModel.findOne({ _id: userId });
        if (!findUserDetails) {
            return console.log("User not found.");
        }

        const findAddress = await addressModel.findOne({ userId: userId });
        if (!findAddress) {
            return console.log("User address not found.");
        }

        const checkedAddress = findAddress.address.find(val => val.id === addressId);
        const { id, number, street, city, state, pin, country } = checkedAddress;

        const products = await cartModel.findOne({ userId: userId }).populate({
            path: 'items.productId',
            populate: {
                path: 'offers',
                select: 'offerType discount startDate endDate'
            }
        });

        if (!products) {
            return console.log("Products not found in cart.");
        }

        const currentDate = new Date();
        let orginalAmount = products.items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
        const productsDetails = products.items.map(item => {
            const product = item.productId;
            let discountAmount = 0;

            // Check for active offers
            const activeOffer = product.offers.find(offer => 
                offer.startDate <= currentDate && offer.endDate >= currentDate
            );

            if (activeOffer) {
                discountAmount = activeOffer.discount;
            }

            const effectivePrice = Math.max(0, product.price - discountAmount);
            return {
                product: product.id,
                name: product.productName,
                quantity: item.quantity,
                price: effectivePrice,
                productStatus: 'Pending'
            };
        });

        let totalAmount = productsDetails.reduce((acc, item) => acc + (item.quantity * item.price), 0);

        // Apply coupon discount if available
        if (coupon.length > 0) {
            const fetchCoupon = await couponModel.findOne({ code: coupon });
            if (!fetchCoupon) {
                console.log("Invalid coupon code.");
            } else {
                totalAmount -= fetchCoupon.discountAmount;
                fetchCoupon.userList.push({ userId });
                await fetchCoupon.save();
            }
        }

        // Check wallet balance
        if (totalAmount > findUserDetails.balance) {
            console.log("Insufficient wallet balance.");
            return res.send({ error: "Insufficient balance" });
        }

        // Check stock availability
        for (const item of productsDetails) {
            const product = await productModel.findOne({ _id: item.product });
            if (!product || product.stock < item.quantity) {
                console.log("Product out of stock or insufficient quantity.");
                return res.send({ error: "Insufficient stock" });
            }
        }

        const newOrder = new orderModel({
            user: userId,
            products: productsDetails,
            shippingAddress: {
                name: findUserDetails.name,
                email: findUserDetails.email,
                number: findUserDetails.number,
                address: id,
                street: street,
                city: city,
                state: state,
                pin: pin,
                country: country
            },
            paymentMethod: 'wallet',
            totalAmount: totalAmount,
            orginalAmount: orginalAmount,
            status: 'Pending'
        });

        const saveOrder = await newOrder.save();
        if (saveOrder) {
            // Deduct stock for each product in the order
            for (const item of productsDetails) {
                const product = await productModel.findOne({ _id: item.product });
                product.stock -= item.quantity;
                await product.save();
            }

            // Deduct wallet balance
            findUserDetails.balance -= totalAmount;
            await findUserDetails.save();

            // Clear cart
            products.items = [];
            await products.save();

            // Log transaction
            const transaction = new transactionModel({
                userId: userId,
                amount: totalAmount,
                type: 'debit'
            });
            await transaction.save();

            console.log("Order placed successfully.");
            res.send({ success: true, orderId: saveOrder.id });
        } else {
            console.log("Failed to place order.");
        }
    } catch (error) {
        console.log(error);
        res.status(500).send({ error: "Internal Server Error" });
    }
};


module.exports = {

    loadWallet,
    loadmyAccountWallet,
    orderWithWallet
}