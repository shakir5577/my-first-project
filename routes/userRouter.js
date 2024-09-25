const express = require("express")
const router = express.Router()
const passport = require('passport')


const userController = require('../controllers/userController')
const accountController = require('../controllers/accountController')
const passportController = require('../controllers/passportControlller')
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
router.get('/checkOut',userController.showCheckOut)    

router.get('/myAccount',session.isLogin,accountController.showMyaccount)
router.get('/orders',session.isLogin,accountController.showOrders)
router.get('/address',session.isLogin,accountController.showAddress)
router.post('/addAddress',accountController.createAddress)
router.post('/editAddress',accountController.editAddress)
router.post('/deleteAddress',accountController.deleteAddress)
router.get('/accountDetails',session.isLogin,accountController.showAccountDetails)
router.post('/editAccount',accountController.editAccount)
router.post('/changePassword',accountController.changePassword)

router.get('/success', passportController.successGoogleLogin); 
router.get('/failure', passportController.failureGoogleLogin);
router.get('/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/failure' }), 
    passportController.successGoogleLogin
);
router.get('/auth/google', passport.authenticate('google', { scope: ['email', 'profile'] }));












module.exports = router;