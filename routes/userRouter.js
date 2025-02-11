const express = require("express")
const router = express.Router()
const passport = require('passport')


const userController = require('../controllers/user/userController')
const accountController = require('../controllers/user/accountController')
const passportController = require('../controllers/user/passportControlller')
const orderController = require('../controllers/user/orderController')
const wishlistController = require('../controllers/user/wishlistController')
const couponController = require('../controllers/user/couponController')
const razorpayController = require('../controllers/user/razorpayController')
const walletController = require('../controllers/user/walletController')
const session = require('../middlewares/sessionCheck')



router.get('/register',userController.loadRegister)
router.post('/register',userController.userVerify)
router.get('/login' ,session.isLogout,userController.loadLogin)
router.post('/login',userController.verifyLogin) 
router.get('/otp',userController.loadOtp)
router.get('/', userController.loadHome)
router.get('/home', userController.loadHome)
router.post('/verifyotp',userController.userVerifyOtp)
router.get('/resendOtp',userController.resendOtp)
router.get('/shop', userController.loadShop)
router.get('/showProduct',session.isLogin,userController.loadSingleProduct)
router.get('/cart',session.isLogin,userController.loadCart)
router.post('/addToCartSinglePro',userController.addToCartSinglePro)
router.post('/removeFromCart',userController.removeFromCart)
router.post('/decrementQuantity',userController.decrementQuantity)
router.post('/incrementQuantity',userController.incrementQuantity)
router.get('/checkOut',session.isLogin,userController.showCheckOut)
router.get('/about',userController.showAbout)
router.get('/search-products',userController.searchSortFilter)
router.post('/forgot-password',userController.forgotPassword)
router.get('/reset-password/:token',userController.loadResetPassword)
router.post('/reset-password',userController.resetPassword)

router.get('/forgot-password', (req, res) => {
    res.render('user/forgotPassword', { error: null, success: null });
});

router.get('/myAccount',session.isLogin,accountController.showMyaccount)
router.get('/orders',session.isLogin,accountController.showOrders)
router.get('/orderDetailes',session.isLogin,accountController.orderDetailes)
router.get('/address',session.isLogin,accountController.showAddress)
router.post('/addAddress',accountController.createAddress)
router.post('/editAddress',accountController.editAddress)
router.post('/deleteAddress',accountController.deleteAddress)
router.get('/accountDetails',session.isLogin,accountController.showAccountDetails)
router.post('/editAccount',accountController.editAccount)
router.post('/changePassword',accountController.changePassword)
router.get('/referEarn',session.isLogin,accountController.showReferEarn)
router.get('/logout',session.isLogin,accountController.logout)

router.post('/placeOrder',orderController.placeOrder)
router.get('/orderComplete',session.isLogin,orderController.orderComplete)
router.post('/cancelOrder',orderController.cancelOrder)
router.get('/Invoice/:orderId',orderController.generateInvoice)
router.post('/cancelSingleProduct',accountController.cancelSingleProduct)
router.post('/returnSingleOrder',accountController.returnSingleOrder)

router.get('/wishlist',session.isLogin,wishlistController.loadWishlist)
router.post('/addToWishlist',wishlistController.addToWishlist)
router.post('/removeFromWishlist',wishlistController.removeFromWishlist)

router.get('/coupon',couponController.showCoupon)
router.post('/applyCoupon',couponController.applyCoupon)

router.post('/createOrder',razorpayController.createOrder)
router.post('/verifyPayment',razorpayController.verifyPayment)
router.post('/checkLIst', razorpayController.checkList)

router.get('/walletHistory',session.isLogin,walletController.loadWallet)
router.get('/wallet',session.isLogin,walletController.loadmyAccountWallet)
router.post('/orderWithWallet',walletController.orderWithWallet)


router.get('/success', passportController.successGoogleLogin); 
router.get('/failure', passportController.failureGoogleLogin);
router.get('/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/failure' }), 
    passportController.successGoogleLogin
);
router.get('/auth/google', passport.authenticate('google', { scope: ['email', 'profile'] }));
router.get('/*',userController.showErrorPage)














module.exports = router;