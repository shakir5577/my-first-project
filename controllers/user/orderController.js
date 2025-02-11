
const PDFDocument = require('pdfkit')

const orderModel = require('../../models/orderModel')
const userModel = require('../../models/userModel')
const productModel = require('../../models/productModel')
const addressModel = require('../../models/addressModel')
const cartModel = require('../../models/cartModel')
const couponModel = require('../../models/couponModel')
const transactionModel = require('../../models/transactionSchema')

const placeOrder = async (req, res) => {
    try {
        const { addressId, coupon } = req.body;
        const { userId } = req.session;

        if (!addressId) {
            console.log("Can't find address ID");
            return;
        }

        const findUserDetails = await userModel.findOne({ _id: userId });
        if (!findUserDetails) {
            console.log("Can't find user");
            return;
        }

        const findUserAddress = await addressModel.findOne({ userId: userId });
        const checkedAddress = findUserAddress?.address.find(val => val.id === addressId);
        if (!checkedAddress) {
            console.log("Address not found");
            return;
        }

        const products = await cartModel.findOne({ userId: userId }).populate({
            path: "items.productId",
            populate: {
                path: "offers",
                select: "offerType discount startDate endDate"
            }
        });

        if (!products) {
            console.log("Can't find products");
            return;
        }

        const currentDate = new Date();
        let originalAmount = products.items.reduce((acc, item) => acc + (item.quantity * item.price), 0);

        for (const item of products.items) {
            const product = item.productId;
            const findProduct = await productModel.findById(product);
            if (findProduct?.isBlock) {
                return res.status(400).send({ error: `Product ${findProduct.productName} is currently unavailable` });
            }
        }

        const productsDetails = products.items.map(async (item) => {
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
        // console.log(totalAmount)
        // const originalAmount = totalAmount;

        // Apply coupon discount if provided
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

        const newOrder = new orderModel({
            user: userId,
            products: productsDetails,
            shippingAddress: {
                name: findUserDetails.name,
                email: findUserDetails.email,
                number: findUserDetails.number,
                address: checkedAddress.id,
                street: checkedAddress.street,
                city: checkedAddress.city,
                state: checkedAddress.state,
                pin: checkedAddress.pin,
                country: checkedAddress.country
            },
            paymentMethod: 'cod',
            totalAmount: totalAmount,
            orginalAmount: originalAmount,
            status: 'Pending'
        });

        const saveOrder = await newOrder.save();

        if (saveOrder) {
            for (const item of productsDetails) {
                const product = await productModel.findOne({ _id: item.product });
                if (!product) {
                    console.log("Product not found");
                    continue;
                }
                product.stock -= item.quantity;
                await product.save();
            }

            products.items = [];
            await products.save();
            res.send({ success: true });
        }
    } catch (error) {
        console.log(error);
        res.status(500).send({ error: "Internal Server Error" });
    }
};


const orderComplete = async (req, res) => {

    try {

        res.render('user/orderComplete')


    } catch (error) {
        console.log(error)
    }
}

const cancelOrder = async (req, res) => {

    try {

        const { orderId } = req.body
        const { userId } = req.session

        if (!orderId) {
            return res.status(400).send("order ID is required")
        }

        const findOrder = await orderModel.findById(orderId)

        if (!findOrder) {
            return res.statud(400).send("order not found")
        }

        findOrder.status = 'Cancelled'

        for (const productOrder of findOrder.products) {
            productOrder.productStatus = 'Cancelled'

            //update the stock of the product

            const product = await productModel.findById(productOrder.product)
            if (product) {
                product.stock += productOrder.quantity
                await product.save()

            } else {
                return res.status(404).send("product not found")
            }
        }

        const updateReturn = await findOrder.save()

        if (findOrder.paymentMethod === 'Razor Pay' || findOrder.paymentMethod === 'wallet') {

            const user = await userModel.findById(userId)
            user.balance += findOrder.totalAmount
            await user.save()

            const transaction = new transactionModel({
                userId: userId,
                amount: findOrder.totalAmount,
                type: 'credit',
                orderId
            })

            await transaction.save()

            res.send({ success: 1, message: 'Order returned, balance credited, and stock updated' })

        } else if (updateReturn) {
            res.send({ success: 2, message: 'Order returned successfully and stock updated' })

        } else {
            res.send(500).send('failed to update order status')
        }

    } catch (error) {
        console.log(error)
    }
}


const generateInvoice = async (req, res) => {
    try {
        console.log('Reached for generate pdf');
        const orderId = req.params.orderId;

        const order = await orderModel.findById(orderId).populate('user');
        console.log('Order while generating PDF:', order);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const user = order.user;
        const address = order.shippingAddress;

        if (!address) {
            console.log('Error: Address not found');
            return res.status(404).json({ success: false, message: 'Address not found' });
        }

        const invoiceNumber = `INV-${order._id}-${Date.now()}`;

        // Initialize PDF document
        const doc = new PDFDocument({ margin: 50 });
        res.setHeader('Content-Disposition', `attachment; filename=${invoiceNumber}.pdf`);
        res.setHeader('Content-Type', 'application/pdf');

        // Pipe PDF to the response
        doc.pipe(res);

        // Invoice Title
        doc.fontSize(20).text('Invoice', { align: 'center' });
        doc.moveDown();

        // Order Details
        doc.fontSize(12)
            .text(`Invoice Number: ${invoiceNumber}`)
            .text(`Order Date: ${order.date || 'N/A'}`)
            // .text(`Status: ${order.status || 'N/A'}`)
            .text(`Payment Method: ${order.paymentMethod || 'N/A'}`)
            // .text(`Payment Status: ${order.status || 'N/A'}`)
            .moveDown();

        // User Details
        doc.text(`User: ${user.name || 'N/A'}`)
            .text(`Email: ${user.email || 'N/A'}`)
            .text(`Phone: ${user.number || 'N/A'}`)
            .moveDown();

        // Delivery Address
        doc.fontSize(14).text('Delivery Address').moveDown(0.5);
        doc.fontSize(12)
            .text(` Name: ${address.name || 'N/A'}`)
            .text(`Phone: ${address.number || 'N/A'}`)
            .text(`Street Address: ${address.street || 'N/A'}`)
            .text(`City: ${address.city || 'N/A'}`)
            .text(`State: ${address.state || 'N/A'}`)
            .text(`Zip: ${address.pin || 'N/A'}`)
            .text(`Country: ${address.country || 'N/A'}`)
            .moveDown();

        // Products Section
        doc.fontSize(14).text('Products', { underline: true }).moveDown(0.5);

        const deliveredProducts = order.products.filter(product => product.productStatus === "Delivered");

        deliveredProducts.forEach((product, index) => {
            doc.fontSize(12)
                .text(`${index + 1}. Product ID: ${product.product || 'N/A'}`)
                .text(`   Quantity: ${product.quantity || 0}`)
                .text(`   Price: ${product.price || 0}`)
                .moveDown(0.5);
        });
        
        // Calculate total price of only delivered products
        const deliveredTotalPrice = deliveredProducts.reduce((sum, product) => sum + (product.price || 0) * (product.quantity || 0), 0);
        
        // Display total price
        doc.fontSize(16).text(`Total Price: ${deliveredTotalPrice}`, { align: 'right' });

        // Finalize PDF
        doc.end();
    } catch (error) {
        console.error('Error generating invoice:', error.message);
        return res.status(500).json({ success: false, message: 'Error generating invoice' });
    }
};


module.exports = {

    placeOrder,
    orderComplete,
    cancelOrder,
    generateInvoice
}