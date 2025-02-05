
const express = require("express")
const router = express.Router()
const multer = require('multer');
const path = require('path')


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../public/productImages')); 
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname); 
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 5 }
});




const adminController = require('../controllers/admin/adminController')
const couponController = require('../controllers/admin/couponController')
const offerController = require('../controllers/admin/offerController')
const salesController = require('../controllers/admin/salesController')
const adminCheck = require('../middlewares/adminCheck')



router.get('/',adminCheck.isLogout,adminController.adminLogin)
router.post('/', adminController.verifyAdminLogin)
router.get('/Dashboard',adminCheck.isLogin,adminController.adminDashboard)
router.get('/users',adminCheck.isLogin,adminController.showUsers)
router.post('/userblock', adminController.blockUser)
router.get('/categories',adminCheck.isLogin,adminController.showCategories)
router.post('/createCategory', adminController.createCategory)
router.post('/blockCategory', adminController.blockCategory)
router.post('/updateCategory', adminController.updateCategory)
router.get('/products',adminCheck.isLogin,adminController.showProducts)
router.get('/createProducts',adminCheck.isLogin,adminController.loadCreateProduct)
router.post('/createProducts', upload.array('productImage', 3), adminController.createProducts)
router.post('/blockProduct', adminController.blockProduct)
router.get('/editProduct',adminCheck.isLogin,adminController.showEditproduct)
router.post('/updateProduct', upload.fields([{ name: 'image1' }, { name: 'image2' }, { name: 'image3' }]), adminController.updateProduct)
router.get('/orders',adminCheck.isLogin,adminController.showOrders)
router.get('/orderDetails',adminCheck.isLogin,adminController.orderDetails)
router.post('/updateReturnRequest', adminController.updateReturnRequest)



router.post('/changeProductStatus',adminController.changeProductStatus)
router.post('/changeOrderStatus',adminController.changeOrderStatus)

router.get('/Coupon',adminCheck.isLogin,couponController.showCoupon)
router.get('/createCoupon',adminCheck.isLogin,couponController.showCreateCoupon)
router.post('/createCoupon',couponController.createCoupon)
router.post('/deleteCoupon',couponController.deleteCoupon)
router.get('/editCoupon',adminCheck.isLogin,couponController.loadEditCoupon)
router.post('/editCoupon',couponController.editCoupon)

router.get('/offers',adminCheck.isLogin,offerController.showOffer)
router.get('/createOffers',adminCheck.isLogin,offerController.showCreateOffer)
router.post('/createOffers',offerController.createOffer)
router.post('/deleteOffer',offerController.deleteOffer)

router.get('/salesReport',adminCheck.isLogin,salesController.showSalesReport)
router.get('/adminLogout',adminCheck.isLogin,adminController.adminLogout)





module.exports = router;