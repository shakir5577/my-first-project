
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




const adminController = require('../controllers/adminController')



router.get('/', adminController.adminLogin)
router.post('/', adminController.verifyAdminLogin)
router.get('/Dashboard', adminController.adminDashboard)
router.get('/users', adminController.showUsers)
router.post('/userblock', adminController.blockUser)
router.get('/categories', adminController.showCategories)
router.post('/createCategory', adminController.createCategory)
router.post('/blockCategory', adminController.blockCategory)
router.post('/updateCategory', adminController.updateCategory)
router.get('/products', adminController.showProducts)
router.get('/createProducts', adminController.loadCreateProduct)
router.post('/createProducts', upload.array('productImage', 3), adminController.createProducts)
router.post('/blockProduct', adminController.blockProduct)
router.get('/editProduct', adminController.showEditproduct)
router.post('/updateProduct', upload.fields([{ name: 'image1' }, { name: 'image2' }, { name: 'image3' }]), adminController.updateProduct)
router.get('/orders',adminController.showOrders)





module.exports = router;