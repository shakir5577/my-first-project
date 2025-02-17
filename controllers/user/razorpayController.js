// const instance = require('../../config/razorpay')
const crypto = require('crypto');
const Razorpay = require('razorpay');
const cartModel = require('../../models/cartModel')
const userModel = require('../../models/userModel')
const addressModel = require('../../models/addressModel')
const couponModel = require('../../models/couponModel')
const orderModel = require('../../models/orderModel')
const productModel = require('../../models/productModel')
const categoryModel = require('../../models/categoryModel')
require('dotenv').config()

const instance = new Razorpay({
    key_id: 'rzp_test_i8191KFpq7S1w1', // Replace with Razorpay Test Key ID
    key_secret: 'TMve1HXwBuQV9AIrnOxghVE2' // Replace with Razorpay Test Key Secret
});

const createOrder = async (req, res) => {
    try {
        const { userId } = req.session;
        const { addressId, coupon } = req.body;

        const findUserDetails = await userModel.findOne({ _id: userId });
        if (!findUserDetails) {
            return console.log("Can't find user at place order...");
        }

        const findUserAddress = await addressModel.findOne({ userId: userId });
        if (!findUserAddress) {
            return console.log("Can't find user address at place order...");
        }

        const checkAddress = findUserAddress.address.find(val => val.id === addressId);
        if (!checkAddress) {
            return console.log("Address not found");
        }

        const { id, number, street, city, state, pin, country } = checkAddress;

        const products = await cartModel.findOne({ userId: userId })
            .populate({
                path: "items.productId",
                populate: {
                    path: "offers",
                    select: "offerType discount startDate endDate"
                }
            });

        if (!products) {
            return console.log('Cant find products');
        }

        for (const item of products.items) {
            const product = item.productId;

            const findProduct = await productModel.findById(product);
            if (findProduct?.isBlock) {
                return res.status(400).send({ error: `Product ${findProduct.productName} is currently unavailable` });
            }

            console.log(findProduct)

            const categoryDoc = await categoryModel.findOne({ categoryName: findProduct.category });
            console.log(categoryDoc)

            if (categoryDoc && categoryDoc.isBlock) {
                return res.status(400).send({ error: `Category ${categoryDoc.categoryName} is currently unavailable` });
            }
        }

        const currentDate = new Date();
        let orginalAmount = products.items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
        const productsDetails = products.items.map(item => {
            const product = item.productId;
            let discountAmount = 0;

            // Check for active offers on the product
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

        if (coupon?.length > 0) {
            const fetchCoupon = await couponModel.findOne({ code: coupon });
            if (!fetchCoupon) {
                console.log("Invalid coupon code");
            } else {
                totalAmount -= fetchCoupon.discountAmount;
                fetchCoupon.userList.push({ userId });
                await fetchCoupon.save();
            }
        }

        const options = {
            amount: totalAmount * 100,
            currency: 'INR',
            receipt: `order_rcptid_${Math.random() * 1000}`,
        };

        const razorpayOrder = await instance.orders.create(options);

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
            paymentMethod: 'Razor Pay',
            razorpayId: razorpayOrder.id,
            totalAmount: totalAmount,
            orginalAmount: orginalAmount,
            status: 'Payment Pending'
        });

        const saveOrder = await newOrder.save();

        if (saveOrder) {
            for (const item of productsDetails) {
                const product = await productModel.findOne({ _id: item.product });
                if (!product) {
                    console.log("Product not found");
                    continue;
                }
                // product.stock -= item.quantity;
                await product.save();
            }

            products.items = [];
            await products.save();
        }

        res.status(201).json({ success: true, order: razorpayOrder, orderId: saveOrder.id });
    } catch (error) {
        console.log(error);
        res.status(500).send({ error: "Internal Server Error" });
    }
};


const verifyPayment = async (req, res) => {
    try {
        console.log(req.body);

        const {
            razorpayPaymentId,
            razorpayOrderId,
            razorpaySignature,
            orderId
        } = req.body;

        const order = await orderModel.findById(orderId).populate('products.product');

        if (!order) {
            return res.status(400).json({ success: false, message: "Order not found" });
        }

        const generatedSignature = crypto.createHmac('sha256', process.env.RAZOR_KEY_SECRET)
            .update(razorpayOrderId + '|' + razorpayPaymentId)
            .digest('hex');

        if (generatedSignature === razorpaySignature) {
            // Loop through each product in the order
            for (let item of order.products) {
                // Retrieve the product details by ID
                const product = await productModel.findById(item.product._id);

                if (!product) {
                    return res.status(400).json({ success: false, message: "Product not found" });
                }

                // Check if the product itself is blocked
                // if (product.isBlock) {
                //     return res.status(400).json({ 
                //         success: false, 
                //         message: `Product ${product.productName} is blocked` 
                //     });
                // }

                // // Now, check if the category is blocked by querying the categories collection
                // const category = await categories.findOne({ categoryName: product.category });
                // if (category && category.isBlock) {
                //     return res.status(400).json({ 
                //         success: false, 
                //         message: `Category ${category.categoryName} is blocked` 
                //     });
                // }

                // Reduce product stock if validations pass
                product.stock -= item.quantity;
                await product.save();
            }

            // Update order status and clear the user's cart
            order.status = "Pending";
            await order.save();

            const cart = await cartModel.findOne({ userId: order.myUsers });
            if (cart) {
                cart.items = [];
                await cart.save();
            }

            return res.status(200).json({ success: true, orderId: order._id });
        } else {
            return res.status(500).json({ success: false, message: 'Payment verification failed' });
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

const checkList = async (req, res) => {
    try{
        const {
            orderId
        } = req.body

        const order = await orderModel.findById(orderId).populate('products.product');

        if (!order) {
            return res.status(400).json({ success: false, message: "Order not found" });
        }

        for (let item of order.products) {
            // Retrieve the product details by ID
            const product = await productModel.findById(item.product._id);

            if (!product) {
                return res.status(400).json({ success: false, message: "Product not found" });
            }

            // Check if the product itself is blocked
            if (product.isBlock) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Product ${product.productName} is blocked` 
                });
            }

            // Now, check if the category is blocked by querying the categories collection
            const category = await categoryModel.findOne({ categoryName: product.category });
            if (category && category.isBlock) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Category ${category.categoryName} is blocked` 
                });
            }
        }

    }catch(err){
        return res.status(500).json({ success: false, message: "Server error" });
    }
    res.status(200).json({success: true, message: 'products and category\'s are fine'})
}



module.exports = {
    createOrder,
    verifyPayment,
    checkList
}