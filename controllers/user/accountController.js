const userModel = require('../../models/userModel')
const addressModel = require('../../models/addressModel')
const orderModel = require('../../models/orderModel')
const productModel = require('../../models/productModel')
const transactionModel = require('../../models/transactionSchema')
const bcrypt = require("bcrypt")


const showMyaccount = async (req, res) => {

    const { userId } = req.session

    const findUser = await userModel.findById(userId)
    // console.log(findUser)

    // console.log(req.session)

    // console.log('this is userId' ,userId)

    res.render('user/myAccount', { findUser: findUser })
}

const showOrders = async (req, res) => {

    try {

        const { userId } = req.session
        const findOrder = await orderModel.find({ user: userId }).sort({date: -1})
        // console.log(findOrder)

        res.render('user/myaccountOrders', { orders: findOrder })


    } catch (error) {

        console.log(error);

    }
}
const orderDetailes = async (req, res) => {
    try {
        const { id } = req.query;

        const findOrder = await orderModel.findById(id)
            .populate({
                path: 'products.product',
                populate: { path: 'offers' }
            });

        if (!findOrder) {
            return console.log("can't get order details in load order details");
        }


        // Initialize amounts for calculation
        let originalAmount = 0;
        let discount = 0;
        let totalAmount = 0;

        findOrder.products.forEach(item => {
            const productOriginalPrice = item.price * item.quantity;
            originalAmount += productOriginalPrice;

            // Calculate the total discount for this item
            let itemDiscount = 0;

            // Apply offer discount if available
            if (item.product.offers && item.product.offers.length > 0) {
                item.product.offers.forEach(offer => {
                    itemDiscount += offer.discount * item.quantity;
                });
            }

            // Apply coupon discount if a coupon is applied to the order
            if (findOrder.coupon) {
                itemDiscount += findOrder.coupon.discountAmount;
            }

            discount += itemDiscount;
            totalAmount += productOriginalPrice - itemDiscount;
        });

        const grandTotal = totalAmount;

        res.render('user/orderDetailes', {
            order: findOrder,
            originalAmount,
            discount,
            grandTotal,
        });
    } catch (error) {
        console.log(error);
    }
};



const cancelSingleProduct = async (req, res) => {

    try {

        const { orderId, productId } = req.body

        const { userId } = req.session

        if (!orderId || !productId) {
            return console.log("can't get order id and product id at cancel single product")
        }

        const findOrder = await orderModel.findById(orderId)

        // console.log(findOrder)

        if (!findOrder) {
            return console.log("can't find order at cancel single products")
        }

        const product = findOrder.products.find(val => val.product == productId)
       
        // console.log(product)

        if (!product) {
            return console.log("can't find product at cancel single products")
        }

        const findProduct = await productModel.findById(product.product.toString())

        console.log(findProduct)
        

        if (!findProduct) {
            return console.log("cnat find findProduct in cancel singel product")
        }

        findProduct.stock += product.quantity

        await findProduct.save()

        product.productStatus = 'Cancelled'

        const allCancelled = findOrder.products.every(p => p.productStatus === 'Cancelled');
        if (allCancelled) {
            findOrder.status = 'Cancelled';
        }

        const saveCancel = await findOrder.save()

        if(findOrder.paymentMethod == 'Razor Pay' || findOrder.paymentMethod == 'wallet') {

            const user = await userModel.findById(userId)
            user.balance += findProduct.price
            await user.save()

            const transaction = new transactionModel({
                userId : userId,
                amount : findOrder.totalAmount,
                type : 'credit'
            })

            await transaction.save()

            res.send({ success: 1})

        }else if(saveCancel) {
            console.log("cancel product success")
            res.send({ success: 2})
        }

        // if (saveCancel) {
        //     res.send({ success: true })
        // }

    } catch (error) {

        console.log(error);

    }
}

const returnSingleOrder = async (req, res, next) => {
    try {
        const { orderId, productId, reason } = req.body;

        console.log("This is reason: ", reason);

        if (!orderId || !productId) {
            return console.log("Order ID and Product ID are required.");
        }

        const findOrder = await orderModel.findById(orderId);
        if (!findOrder) {
            return console.log("Order not found.");
        }

        const product = findOrder.products.find(val => val.product == productId);
        if (!product) {
            return console.log("Product not found in order.");
        }

        if (product.returnRequested) {
            return console.log("Return request already submitted for this product.");
        }

        // Mark the product as return requested
        product.returnRequested = true;
        product.returnStatus = 'Pending';
        product.returnReason = reason;

        // Add product amount to user's wallet
        const user = await userModel.findById(findOrder.user); // Assuming `userId` is stored in `findOrder`
        if (!user) {
            return console.log("User not found.");
        }

        user.balance += product.price; // Add the product price to user's balance
        await user.save();

        await findOrder.save();

        res.send({ success: true, message: "Return request submitted. Awaiting admin approval." });
    } catch (error) {
        next(error);
    }
};



const showAddress = async (req, res) => {

    try {

        const { userId } = req.session

        const findAddress = await addressModel.findOne({ userId: userId })

        let address

        if (!findAddress) {
            // res.render('user/useraccount', {userDetails: findUserDetails, user: userId, referalLink: referalLink })
            address = []
        } else {
            address = findAddress.address
        }

        res.render('user/myaccountAddress', { address: address })


    } catch (error) {

        console.log(error);

    }
}

const showAccountDetails = async (req, res) => {

    try {
        const { userId } = req.session

        const findUser = await userModel.findById(userId)

        res.render('user/accountDetails', { findUser: findUser })
    } catch (error) {

        console.log(error)
    }
}

const createAddress = async (req, res) => {

    try {

        // console.log(req.body)

        const { userName, userNumber, userStreet, userCity, userState, userPin, userCountry } = req.body

        // console.log(userName, userNumber)

        const { userId } = req.session

        const checkExistingAddress = await addressModel.findOne({ userId: userId })

        console.log(checkExistingAddress)

        if (!checkExistingAddress) {

            const createAddress = new addressModel({

                userId: userId,
                address: [{
                    name: userName,
                    number: userNumber,
                    street: userStreet,
                    city: userCity,
                    state: userState,
                    pin: userPin,
                    country: userCountry
                }]
            })

            const saveAddress = await createAddress.save()
            if (saveAddress) {
                console.log("new address added")
                res.send({ success: true })
                return
            }

        }

        checkExistingAddress.address.push({

            name: userName,
            number: userNumber,
            street: userStreet,
            city: userCity,
            state: userState,
            pin: userPin,
            country: userCountry
        })

        const updateAddress = await checkExistingAddress.save()


        res.send({ success: true })


    } catch (error) {

        console.log(error)
    }
}

const editAddress = async (req, res) => {

    try {

        // console.log(req.body)


        const { addressId, userName, userNumber, userStreet, userCity, userState, userPin, userCountry } = req.body
        const { userId } = req.session

        const findUser = await addressModel.findOne({ userId: userId })

        if (findUser) {
            const findAddress = findUser.address.find(val => val.id == addressId)
            findAddress.name = userName
            findAddress.number = userNumber
            findAddress.street = userStreet
            findAddress.city = userCity
            findAddress.state = userState
            findAddress.pin = userPin
            findAddress.country = userCountry
        }

        await findUser.save()
        res.send({ success: true })
        // console.log(findUser)
    } catch (error) {

        console.log(error)
    }
}

const deleteAddress = async (req, res) => {

    try {

        // console.log(req.session)
        // console.log(req.body)

        const { id } = req.body
        const { userId } = req.session


        console.log(id, userId)

        const rem = await addressModel.updateOne(
            { userId: userId },
            {
                $pull: {
                    address: { _id: id }, // Pull address by matching the address _id
                },
            }
        );

        res.send({ success: true })


    } catch (error) {
        console.log(error)
    }
}

const editAccount = async (req, res) => {

    try {

        const { userName, userNumber } = req.body
        const { userId } = req.session

        const findAccount = await userModel.findOne({ _id: userId })
        // console.log(findAccount)

        findAccount.name = userName
        findAccount.number = userNumber

        const update = await findAccount.save()
        res.send({ success: true })

        if (update) {

            console.log("updated..")

        }

        // console.log(req.body)
        // console.log(req.session)


    } catch (error) {
        console.log(error)
    }
}

const changePassword = async (req, res) => {

    try {

        // console.log(req.body)
        const { userId, oldPassword, newPassword } = req.body
        const findUser = await userModel.findById(userId)
        if (!findUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        // console.log(userId)
        // console.log(findUser)

        const isMatch = await bcrypt.compare(oldPassword, findUser.password)
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Old password is incorrect' });
        }
        // console.log(isMatch)

        const hashedPassword = await bcrypt.hash(newPassword, 10)
        // console.log(hashedPassword)

        findUser.password = hashedPassword
        await findUser.save()
        res.send({ success: true })


    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
}

const showReferEarn = async (req, res, next) =>{

    try{

        const { userId } = req.session
        // console.log(req.session)

        let referalLink = 'shaaky.online/register?reff=' + userId

        if(!referalLink){
            console.log('referal link is not find')
        }

        res.render('user/referEarn',{referalLink:referalLink})

    }catch(error){
        next(error)
    }
}

const logout = async (req, res, next) => {

    try {

        const des = req.session.destroy();
        res.redirect('/login')
    } catch (error) {
        next(error)
    }
}


module.exports = {
    showMyaccount,
    showOrders,
    showAddress,
    createAddress,
    editAddress,
    deleteAddress,
    showAccountDetails,
    editAccount,
    changePassword,
    logout,
    orderDetailes,
    cancelSingleProduct,
    returnSingleOrder,
    showReferEarn
}