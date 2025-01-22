
const mongoose = require("mongoose")
const userModel = require("../../models/userModel")
const bcrypt = require("bcrypt")
const nodemailer = require("nodemailer")
const otpModel = require("../../models/otpModel")
const productModel = require('../../models/productModel')
const categoryModel = require('../../models/categoryModel')
const cartModel = require('../../models/cartModel')
const addressModel = require("../../models/addressModel")
const couponModel = require('../../models/couponModel')
const transactionModel = require('../../models/transactionSchema')
const crypto = require('crypto')

require('dotenv').config();





const loadHome = async (req, res) => {

    try {
        const allProducts = await productModel.find({ isBlock: false })
            .populate({
                path: 'offers',
                select: 'offerType discount'
            })

        res.render('user/home', { products: allProducts, user: req.session.userId ?? null })

    } catch (error) {
        console.log(error)
    }
}


const loadRegister = async (req, res) => {

    try {

        const{ reff } = req.query 

        res.render("user/userRegister",{ reff: reff })

    } catch (error) {

        console.error(error.message)
    }
}


const loadLogin = async (req, res) => {

    try {

        console.log('this is login')

        res.render("user/userLogin")

    } catch (error) {

        console.error(error.message)
    }
}

const loadOtp = async (req, res) => {

    try {

        const newUser = req.session.user

        console.log(req.session)

        function generateOTP() {
            return Math.floor(100000 + Math.random() * 900000);
        }

        const otp = await generateOTP();
        console.log(otp);

        console.log(process.env.EMAIL_PASS)

        const sender = nodemailer.createTransport({

            service: "gmail",
            auth: {

                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        })

        req.session.userOtp = otp

        const otpSave = new otpModel({

            email: newUser.email,
            otp: otp
        })

        const otpSaving = await otpSave.save()
        if (!otpSaving) {

            return console.log("error in otp saving...")
        }

        const emailTosend = {

            from: process.env.EMAIL_USER,
            to: newUser.email,
            subject: "your one time password (OTP) for footwear website login",
            text: `Your One-Time Password (OTP) for logging into our website is:  "${otp}".  Please use this code within the next few seconds to complete the sign process. Thank you for using our services.`
        }


        sender.sendMail(emailTosend, (error, info) => {

            if (error) {

                console.log("hai", error)

            } else {

                console.log("otp mail send:")
            }
        })

        res.render("user/otp")

    } catch (error) {

        console.error(error.message)
    }
}

const userVerifyOtp = async (req, res, next) => {

    try {

        const realOtp = req.session.userOtp
        const userTypedOtp = req.body.otp

        console.log(realOtp)
        console.log(userTypedOtp)


        if (userTypedOtp == realOtp) {

            const otpVerifyUser = req.session.user;
            console.log(otpVerifyUser)

            let balance;

            if(otpVerifyUser.refId.length > 0){

                const findUser = await userModel.findOne({ _id:otpVerifyUser.refId })
                // console.log(findUser)
                findUser.balance += 101
                await findUser.save()

                balance = 101

                const refTransaction = new transactionModel({
                    userId: otpVerifyUser.refId,
                    amount: 101,
                    type: 'refferal'
                })

                await refTransaction.save()

            }else{

                balance = 0
            }
            const hashedPassword = await bcrypt.hash(otpVerifyUser.password, 10)

            const saveNewUser = new userModel({

                name: otpVerifyUser.username,
                email: otpVerifyUser.email,
                number: otpVerifyUser.mobile,
                password: hashedPassword,
                balance:balance
                // isVerified : true
            })

            const saving = await saveNewUser.save();
            if (saving) {

                // req.session.userId = saving.id

                if( otpVerifyUser.refId.length > 0){

                    const refTransactionNewUser = new transactionModel({
                        userId : saving.id,
                        amount : 101,
                        type : 'refferal'
                    })

                    await refTransactionNewUser.save()
                }

                // req.session.userId = saving.id;
                console.log("user saved successfully...");
                res.send({ next: 1 })
            }

        } else {

            res.send({ error: "otp dt match" })
        }

    } catch (error) {

        next(error)
    }
}

const resendOtp = async (req, res) => {

    try {

        // console.log(req.session.user)
        const user = req.session.user

        // Generate a new OTP
        function generateOTP() {
            return Math.floor(100000 + Math.random() * 900000);
        }
        const newOtp = await generateOTP();
        console.log("New OTP:", newOtp);

        req.session.userOtp = newOtp;  // Save the new OTP in the session

        // Update the OTP in the database
        const updatedOtp = await otpModel.findOneAndUpdate(
            { email: user.email },
            { otp: newOtp }
        );

        if (!updatedOtp) {
            return res.status(500).json({ error: "Error updating OTP" });
        }

        // Resend the OTP via email
        const emailTosend = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: "Your Resent One-Time Password (OTP) for Login",
            text: `Your new OTP for logging into our website is: "${newOtp}". Please use this code to complete the process.`,
        };

        const sender = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        sender.sendMail(emailTosend, (error, info) => {
            if (error) {
                return console.log("Error sending OTP:", error);
            }
            console.log("OTP resent successfully");
        });

        return res.json({ success: true, message: "OTP resent successfully!" });

    } catch (error) {
        console.error("Error in resending OTP:", error.message);
        res.status(500).json({ error: "Something went wrong" });
    }
}

const userVerify = async (req, res) => {

    try {

        // console.log(req.body)
        // return
        const { username, email, mobile, password } = req.body

        if (!username.trim()) {
            return res.send({ error: "User name is not here" })
        }


        const checkUser = await userModel.findOne({ email: email })
        if (checkUser) {
            return res.send({ error: "User already exits" })
        }

        req.session.user = req.body;

        res.send({ success: "reg success" })

    } catch (error) {

        req.flash('an error occured during the registration');
        res.redirect('/register')
        console.log(error.message)
    }
}

const verifyLogin = async (req, res) => {

    try {

        const { email, password } = req.body

        // console.log(req.body)

        const checkEmail = await userModel.findOne({ email: email })

        if (!checkEmail) {
            res.send({ error: "user not find, please register" })
            return console.log("user not find, please register")
        }

        const checkPassword = await bcrypt.compare(password, checkEmail.password)

        if (!checkPassword) {
            res.send({ error: "incorrect password" })
            return console.log("incorrect password")
        }
        if (checkEmail.isBlock == true) {

            return res.send({ success: false, message: 'Your account has been blocked.' })

        }

        req.session.userId = checkEmail.id

        res.send({ success: true })
    } catch (error) {

        console.log(error)
    }
}

const loadShop = async (req, res) => {
    try {
        const currentPage = parseInt(req.query.page) || 1;

        const limit = 8;

        const skip = (currentPage - 1) * limit;
        const findAllCategories = await categoryModel.find({ isBlock : false})
        const unblockedCategoryNames = findAllCategories.map((category) => category.categoryName)
        const totalProducts = await productModel.countDocuments({ isBlock: false });

        const products = await productModel
            .find({ isBlock: false, category: { $in:unblockedCategoryNames }, })
            .skip(skip)
            .limit(limit)
            .populate({
                path: 'offers',
                select: 'offerType discount'
            })

        const totalPages = Math.ceil(totalProducts / limit);

        res.render('user/shop', {
            products: products,
            currentPage: currentPage,
            totalPages: totalPages
        });

    } catch (err) {
        console.log(err);
        res.status(500).send('Server Error');
    }
};


const loadSingleProduct = async (req, res) => {
    try {

        const { id } = req.query

        const product = await productModel.findById(id).populate({
            path: 'offers',
            select: 'offerType discount'
        })

        res.render('user/singleProduct', { product: product })
    } catch (err) {
        console.log(err)
    }
}

const loadCart = async (req, res) => {
    try {
        const { userId } = req.session;
        const cart = await cartModel
            .findOne({ userId: userId })
            .populate({
                path: 'items.productId',
                populate: {
                    path: 'offers',
                    select: 'offerType discount startDate endDate' // Include start and end dates to check active offers
                }
            });

        if (!cart) {
            return res.render('user/cart', { cart: null, message: 'Your cart is empty' });
        }

        const totalCartPrice = cart.items.reduce((acc, item) => {
            // Get the product and its offers
            const product = item.productId;
            let discountAmount = 0;

            // Check for active offers
            if (product.offers.length > 0) {
                const currentDate = new Date();
                const activeOffer = product.offers[0]

                if (activeOffer) {
                    discountAmount = activeOffer.discount; // Use the discount amount if an active offer is found
                }
            }

            // Calculate the effective price considering the discount
            const effectivePrice = Math.max(0, item.price - discountAmount);
            return acc + (effectivePrice * item.quantity);
        }, 0);

        // Update total price in cart object
        cart.totalprice = totalCartPrice;
        // console.log(totalCartPrice)

        res.render('user/cart', { cart: cart });

    } catch (error) {
        console.log(error);
        res.status(500).send({ success: false, message: 'Error loading cart' });
    }
};


const addToCartSinglePro = async (req, res) => {

    try {

        const { userId } = req.session
        const { productId, quantity } = req.body

        //    console.log(req.body)
        //    console.log(userId)

        let cart = await cartModel.findOne({ userId })
        //    console.log({cart})

        if (!cart) {

            cart = new cartModel({

                userId,
                items: [],
                totalPrice: 0
            })
        }

        const product = await productModel.findById(productId)
        // console.log(product)


        const existingProduct = cart.items.findIndex(item => item.productId.equals(productId))
        // console.log(existingProduct)
        if (existingProduct >= 0) {

            // cart.items[existingProduct].quantity += parseInt(quantity)
            return res.json({
                success: true,
                alReadyInCart: true
            })

        } else {

            cart.items.push({

                productId: productId,
                quantity: 1,
                price: product.price
            })
        }

        // cart.totalprice = cart.items.reduce((total,item) => total + item.price * item.quantity,0)
        const saving = await cart.save()

        if (saving) {
            console.log("add to cart successfully...")

            res.json({
                success: true,
                product: {
                    name: product.productName,
                    image: product.images[0]
                }
            })
        }
    } catch (error) {
        console.log('Error:', error)
        res.status(500).json({ success: false, message: 'Error adding product to cart' })
    }
}

const removeFromCart = async (req, res) => {

    try {

        const { userId } = req.session
        const { id } = req.body

        const updatedCart = await cartModel.updateOne(
            { userId: userId },
            {
                $pull: { items: { productId: id } }
            }
        );

        res.json({ success: true, message: 'Product removed from cart' })

    } catch (error) {
        console.log(error)
    }
}

const decrementQuantity = async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const { userId } = req.session;
        const cart = await cartModel.findOne({ userId: userId });
        const product = await productModel.findById(productId).populate('offers');  // Fetch product details and populate offers

        let updatedQuantity;
        let itemTotalPrice;

        let offerAmount = 0;

        // Check for active offers and get the discount amount
        if (product.offers.length > 0) {
            const activeOffer = product.offers[0]; // Assuming you're only checking the first offer

            if (activeOffer) {
                offerAmount = activeOffer.discount; // Get the discount amount if the offer is active
            }
        }

        cart.items.forEach(val => {
            if (val.productId.toString() === productId) {
                if (val.quantity > 1) {
                    val.quantity = parseInt(quantity) - 1; // Decrement the quantity
                }
                updatedQuantity = val.quantity;

                // Apply the discount amount, ensuring the price does not drop below zero
                const finalPrice = Math.max(0, val.price - offerAmount);
                itemTotalPrice = finalPrice * updatedQuantity;
            }
        });

        const totalCartPrice = cart.items.reduce((acc, item) => {
            const finalPrice = Math.max(0, item.price - offerAmount); // Calculate the final price with discount
            return acc + (finalPrice * item.quantity);
        }, 0);

        cart.totalprice = totalCartPrice;
        await cart.save();
        res.send({
            success: true,
            updatedQuantity: updatedQuantity,
            itemTotalPrice: itemTotalPrice.toFixed(2),
            totalCartPrice: totalCartPrice.toFixed(2)
        });
    } catch (error) {
        console.error(error);
        res.status(500).send({ success: false, message: 'Error updating quantity' });
    }
};


const incrementQuantity = async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const { userId } = req.session;

        const cart = await cartModel.findOne({ userId: userId });
        const product = await productModel.findById(productId).populate('offers');  // Fetch product details and populate offers

        let updatedQuantity;
        let itemTotalPrice;

        let offerAmount = 0;

        // Check for active offers and get the discount amount
        if (product.offers.length > 0) {
            const activeOffer = product.offers[0]

            if (activeOffer) {
                offerAmount = activeOffer.discount;
            }
        }

        cart.items.forEach(item => {
            if (item.productId.toString() === productId) {
                if (item.quantity < product.stock) {
                    item.quantity = parseInt(quantity) + 1;
                }
                updatedQuantity = item.quantity;

                // Apply the discount amount, ensuring the price does not drop below zero
                const finalPrice = Math.max(0, item.price - offerAmount);
                itemTotalPrice = finalPrice * updatedQuantity;
            }
        });

        const totalCartPrice = cart.items.reduce((acc, item) => {
            const finalPrice = Math.max(0, item.price - offerAmount);
            return acc + (finalPrice * item.quantity);
        }, 0);

        cart.totalprice = totalCartPrice;
        await cart.save();

        res.send({
            success: true,
            updatedQuantity: updatedQuantity,
            itemTotalPrice: itemTotalPrice.toFixed(2),
            totalCartPrice: totalCartPrice.toFixed(2)
        });
    } catch (error) {
        console.error(error);
        res.status(500).send({ success: false, message: 'Error updating quantity' });
    }
};



const showCheckOut = async (req, res) => {

    try {

        // console.log(req.session)

        const { userId } = req.session
        if (!userId) {
            return console.log("user is not found in checkout")
        }
        const findAddress = await addressModel.findOne({ userId: userId })

        const findUsercart = await cartModel.findOne({ userId: userId }).populate('items.productId').populate({
            path: 'items.productId',
            populate: {
                path: 'offers',
                select: 'offerType discount startDate endDate' // Include start and end dates to check active offers
            }
        });
        // console.log(findUsercart.items[0])

        // console.log(findAddress)

        let address

        if (!findAddress) {
            address = []
        } else {
            address = findAddress.address
        }

        // const totalCartPrice = findUsercart.items.reduce((acc, item) => {
        //     return acc + (item.price * item.quantity);
        // }, 0);

        const totalCartPrice = findUsercart.items.reduce((acc, item) => {
            // Get the product and its offers
            const product = item.productId;
            let discountAmount = 0;

            // Check for active offers
            if (product.offers.length > 0) {
                const currentDate = new Date();
                const activeOffer = product.offers[0]

                if (activeOffer) {
                    discountAmount = activeOffer.discount; // Use the discount amount if an active offer is found
                }
            }

            // Calculate the effective price considering the discount
            const effectivePrice = Math.max(0, item.price - discountAmount);
            return acc + (effectivePrice * item.quantity);
        }, 0);

        // Update total price in cart object
        findUsercart .totalprice = totalCartPrice;
        // console.log(totalCartPrice)



        const findCoupon = await couponModel.find()

        if (!findCoupon) {
            console.log("can't find coupons in checkout")
        }


        res.render('user/checkOut', { address: address, userCartItems: findUsercart.items, totalCartPrice: totalCartPrice, coupons: findCoupon })

    } catch (error) {
        console.log(error);

    }
}

const showAbout = async (req, res) => {

    try {

        res.render('user/about')

    } catch (error) {
        console.log(error)
    }
}

const searchSortFilter = async (req, res) => {

    try {

        const { search = '', category = '0', sort = '0' } = req.query;
        // console.log(search, category, sort);

        let query = {};
        query.isBlock = false

        // Apply search filter
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            query.productName = searchRegex;
            // console.log('search product:', searchRegex);
        }

        // Apply category filter
        if (category !== '0') {
            query.category = category;
        }

        // Build the Mongoose query
        let findProduct = productModel.find(query);

        // Apply sorting directly within the query
        if (sort !== '0') {
            switch (parseInt(sort)) {
                case 1: // Name A-Z
                    findProduct = findProduct.sort({ productName: 1 });
                    break;
                case 2: // Name Z-A
                    findProduct = findProduct.sort({ productName: -1 });
                    break;
                case 3: // Price low to high
                    findProduct = findProduct.sort({ price: 1 });
                    break;
                case 4: // Price high to low
                    findProduct = findProduct.sort({ price: -1 });
                    break;
                default:
                    break;
            }
        }

        // Fetch the sorted and filtered products
        const products = await findProduct;

        // console.log(products);
        res.json({ products });


        // res.send("Search and filtering worked!");


    } catch (error) {
        console.log('error:', error)
        res.status(500).send('something went wrong')
    }
};


const showErrorPage = async (req,res) => {

    try{

        res.render('user/404')

    }catch(error){
        console.log(error)
    }
}

const forgotPassword = async (req,res) => {

    try{

        const { email } = req.body

        let error = null
        let success = null

        if(!email){

            error = 'user not find, email is required'
            return res.render('user/forgotPassword',{ error,success })
        }

        const findUser = await userModel.findOne({ email })
        if(!findUser){
            error = 'user with this email does not exist'
            return res.render('user/forgotPassword',{ error,success })
        }

        const resetToken = crypto.randomBytes(32).toString('hex')
        const tokenExpiry = Date.now() + 3600000
        // console.log(resetToken)
        findUser.resetPasswordToken = resetToken
        findUser.resetPasswordExpires = tokenExpiry
        await findUser.save()

        const resetURL = `${req.protocol}://${req.get('host')}/reset-password/${resetToken}`;
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: findUser.email,
            subject: 'Password Reset',
            text: `You requested a password reset. Click the link to reset your password: ${resetURL}`
        };
        const sender = nodemailer.createTransport({

            service: "gmail",
            auth: {

                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        })
        await sender.sendMail(mailOptions)
        success = 'password reset link has been sent to your email'
        res.render('user/forgotPassword',{error,success})

    }catch(error){
        console.log(error)
        error = 'An error occured while processing your request'
        res.render('user/forgotPassword',{error,success:null})
    }
}

const loadResetPassword = async (req,res) => {

    try{

        const resetToken = req.params.token
        // console.log(resetToken)

        const findUser = await userModel.findOne({
            resetPasswordToken: resetToken,
            resetPasswordExpires: { $gt: Date.now()}
        })

        if(!findUser){
            return res.render('user/resetPassword',{ error: 'password reset token is invalid or has expired', token : null})
        }

        res.render('user/resetPassword', { token : resetToken, error : null })

    }catch(error){
        console.log(error)
        res.status(500).send('server error')
    }
}

const resetPassword = async (req,res) => {

    try{

        const { token, newPassword, confirmPassword } = req.body

        if(!newPassword || !confirmPassword){
            return res.render('user/resetPassword',{ error: 'all fields are required', token})
        }

        if (newPassword !== confirmPassword) {
            return res.render('user/resetPassword', { error: 'Passwords do not match', token });
        }

        const findUser = await userModel.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() } // check if token is still valid
        });

        if (!findUser) {
            return res.render('user/resetPassword', { error: 'Token is invalid or has expired', token });
        }

         // Hash the new password
         const hashedPassword = await bcrypt.hash(newPassword, 10); 

         // Update user's password
         findUser.password = hashedPassword;
         findUser.resetPasswordToken = undefined; // remove the token after use
         findUser.resetPasswordExpires = undefined; // remove token expiry
         await findUser.save();
 
         res.redirect(`/login`)

    }catch(error){
        console.log(error)
        res.status(500).send('Server Error');
    }
}




module.exports = {

    loadRegister,
    loadLogin,
    userVerify,
    loadOtp,
    verifyLogin,
    loadHome,
    userVerifyOtp,
    loadShop,
    loadSingleProduct,
    loadCart,
    addToCartSinglePro,
    removeFromCart,
    decrementQuantity,
    incrementQuantity,
    showCheckOut,
    resendOtp,
    showAbout,
    searchSortFilter,
    showErrorPage,
    forgotPassword,
    loadResetPassword,
    resetPassword 
}