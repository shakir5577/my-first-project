
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

require('dotenv').config();


const loadHome = async (req, res) => {

    const allProducts = await productModel.find({ isBlock: false })

    res.render('user/home', { products: allProducts, user: req.session.userId ?? null })
}


const loadRegister = async (req, res) => {

    try {

        res.render("user/userRegister")

    } catch (error) {

        console.error(error.message)
    }
}


const loadLogin = async (req, res) => {

    try {

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

            const hashedPassword = await bcrypt.hash(otpVerifyUser.password, 10)

            const saveNewUser = new userModel({

                name: otpVerifyUser.username,
                email: otpVerifyUser.email,
                number: otpVerifyUser.mobile,
                password: hashedPassword,
                // isVerified : true
            })

            const saving = await saveNewUser.save();
            if (saving) {

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

            return res.send({ success: false , message: 'Your account has been blocked.'})

        }

        req.session.userId = checkEmail.id

        res.send({ success: true })
    } catch (error) {

        console.log(error)
    }
}

const loadShop = async (req, res) => {
    try {
        // Get the current page from query parameters (default to page 1)
        const currentPage = parseInt(req.query.page) || 1;

        // Set the number of products per page
        const limit = 8;

        // Calculate the number of products to skip based on the current page
        const skip = (currentPage - 1) * limit;

        // Get the total count of all products (to calculate total pages)
        const totalProducts = await productModel.countDocuments({ isBlock: false });

        // Fetch the products for the current page
        const products = await productModel
            .find({ isBlock: false })
            .skip(skip)
            .limit(limit);

        // Calculate the total number of pages
        const totalPages = Math.ceil(totalProducts / limit);

        // Render the shop page with products, current page, and total pages
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

        const product = await productModel.findById(id)

        res.render('user/singleProduct', { product: product })
    } catch (err) {
        console.log(err)
    } 
}

const loadCart = async (req, res) => {

    try {

        const { userId } = req.session
        const cart = await cartModel.findOne({ userId: userId }).populate('items.productId')

        if (!cart) {
            return res.render('user/cart', { cart: null, message: 'Your cart is empty' })
        }

        const totalCartPrice = cart.items.reduce((acc, item) => {
            return acc + (item.price * item.quantity);
        }, 0);

        cart.totalprice = totalCartPrice

        res.render('user/cart', { cart: cart })


    } catch (error) {
        console.log(error)
    }
}

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

        let updatedQuantity;
        let itemTotalPrice;

        cart.items.forEach(val => {
            if (val.productId.toString() === productId) {
                if (val.quantity > 1) {
                    val.quantity = parseInt(quantity) - 1;
                }
                updatedQuantity = val.quantity;
                itemTotalPrice = val.price * updatedQuantity;
            }
        });
        const totalCartPrice = cart.items.reduce((acc, item) => {
            return acc + (item.price * item.quantity);
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
        const product = await productModel.findById(productId);  // Fetch product details for stock checking

        let updatedQuantity;
        let itemTotalPrice;

        cart.items.forEach(item => {
            if (item.productId.toString() === productId) {
                // Increment quantity only if it is less than available stock
                if (item.quantity < product.stock) {
                    item.quantity = parseInt(quantity) + 1;
                }
                updatedQuantity = item.quantity;
                itemTotalPrice = item.price * updatedQuantity;
            }
        });

        const totalCartPrice = cart.items.reduce((acc, item) => {
            return acc + (item.price * item.quantity);
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

        const {userId} = req.session
        if(!userId){
            return console.log("user is not found in checkout")
        }
        const findAddress = await addressModel.findOne({userId:userId})

        const findUsercart = await cartModel.findOne({ userId : userId}).populate('items.productId')
        // console.log(findUsercart.items[0])

        // console.log(findAddress)
        
        let address

        if (!findAddress) {
            address = []
        } else {
            address = findAddress.address
        }

        const totalCartPrice = findUsercart.items.reduce((acc, item) => {
            return acc + (item.price * item.quantity);
        }, 0);

        const findCoupon = await couponModel.find()

        if(!findCoupon){
            console.log("can't find coupons in checkout")
        }


        res.render('user/checkOut',{address:address, userCartItems: findUsercart.items,totalCartPrice:totalCartPrice,coupons: findCoupon})

    } catch (error) {
        console.log(error);

    }
}

const showAbout = async (req,res) => {

    try{
        
        res.render('user/about')

    }catch(error){
        console.log(error)
    }
}

const searchSortFilter = async (req, res) => {

    try{

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


    }catch(error){
        console.log('error:',error)
        res.status(500).send('something went wrong')
    }
};






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
    searchSortFilter
}