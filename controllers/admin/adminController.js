

const userModel = require('../../models/userModel')
const categoryModel = require('../../models/categoryModel')
const productModel = require('../../models/productModel')
const orderModel = require('../../models/orderModel')
const transactionModel = require('../../models/transactionSchema')
const bcrypt = require("bcrypt")


const adminLogin = async (req, res) => {

    res.render('admin/adminLogin')
}

const adminDashboard = async (req, res) => {

    res.render('admin/adminDashboard')
}

const showUsers = async (req, res) => {

    const page = parseInt(req.query.page) || 1
    const limit = 5
    const skip = (page - 1) * limit

    const allUsers = await userModel.find().sort({ createdAt: -1 }).limit(limit).skip(skip);
    const totalUsers = await userModel.countDocuments();
    const totalPages = Math.ceil(totalUsers / limit);

    res.render('admin/users', { allUsers: allUsers,currentPage: page, totalPages })
}

const showCategories = async (req, res) => {

    const allCategories = await categoryModel.find()
    res.render('admin/categories', { allCategories: allCategories })
}

const showProducts = async (req, res) => {

    const page = parseInt(req.query.page) || 1
    const limit = 8
    const skip = (page - 1) * limit

    const allProducts = await productModel.find().sort({ createdAt: -1 }).limit(limit).skip(skip);
    const totalProducts = await userModel.countDocuments();
    const totalPages = Math.ceil(totalProducts / limit);
    res.render('admin/products', { allProducts: allProducts,currentPage: page, totalPages })
}

const loadCreateProduct = async (req, res) => {

    const allCategories = await categoryModel.find()
    res.render('admin/createProduct', { allCategories: allCategories })

}

const showEditproduct = async (req, res) => {

    const product = await productModel.findById(req.query.id)


    const allCategories = await categoryModel.find()

    // console.log(product)

    // console.log(req.query.id)

    res.render('admin/editProduct', { product: product, allCategories:allCategories })
}

const showOrders = async(req,res) => {

    try{

        const page = parseInt(req.query.page) || 1
        const limit = 5
        const skip = (page - 1) * limit

        const orders = await orderModel.find().sort({ date: -1 }).limit(limit).skip(skip);
        const totalOrders = await orderModel.countDocuments();
        const totalPages = Math.ceil(totalOrders / limit);

        const returnRequests = await orderModel.find({ 'products.returnRequested': true }).sort({ createdAt: -1})
        .populate('products.product') // Populate product details

        const returnRequestsCount = await orderModel.find({ 'products.returnRequested': true }).countDocuments();


        res.render('admin/orders',{orders: orders,currentPage: page, totalPages , reqCount: returnRequestsCount, returns: returnRequests })

    }catch(error){
        console.log(error)
    }

}

const orderDetails = async (req,res) => {

    try{

        console.log(req.query)

        const { orderId } = req.query

        if (!orderId) {
            return console.log("can't get order id at load order details")
        }

        const findOrder = await orderModel.findOne({ _id: orderId }).populate('user').populate('products.product')

        res.render('admin/orderDetails', {orderDetails: findOrder})


    }catch(error){
        console.log(error)
    }
}

const updateReturnRequest = async (req, res, next) => {
    try {
        console.log('hhhhhha')
        const { orderId, productId, status } = req.body;

        if (!orderId || !productId || !status) {
            return res.status(400).json({ message: 'Order ID, Product ID, and Status are required' });
        }

        const order = await orderModel.findOne({ _id: orderId, 'products.product': productId });

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const product = order.products.find(val => val.product.toString() === productId);

        if (!product) {
            return res.status(404).json({ message: 'Product not found in the order' });
        }

        const findUser = await userModel.findById(order.user);

        if (!findUser) {
            return console.log("User not found at updateReturnRequest");
        }

        product.returnStatus = status;

        if (status === 'Approved') {
            product.productStatus = 'Returned';

            // Return the user's money regardless of the reason
            findUser.balance += product.price * product.quantity; // Increment balance by the total price of the returned products

            // Create a transaction record
            const transaction = new transactionModel({
                userId: findUser.id,
                amount: product.price * product.quantity, // Total amount credited back to the user
                type: 'credit'
            });

            await transaction.save();

            // Update stock only if the return reason is not 'Product is damaged'
            if (product.returnReason !== 'Product is damaged') {
                const productToUpdate = await productModel.findById(productId);
                if (productToUpdate) {
                    productToUpdate.stock += product.quantity; // Increment stock by the quantity returned
                    await productToUpdate.save();
                } else {
                    return res.status(404).json({ message: 'Product not found in the inventory' });
                }
            }
        }

        const allReturned = order.products.every(p => p.returnStatus === 'Approved');

        if (allReturned) {
            order.orderStatus = 'Returned';
        }

        await order.save();

        res.status(200).json({ success: 'Return request updated successfully' });
    } catch (error) {
        next(error);
    }
};





const verifyAdminLogin = async (req, res) => {

    try {

        const { email, password } = req.body

        const findAdmin = await userModel.findOne({ email: email })

        if (!findAdmin) {

            return console.log("error: Admin not found")
        }

        if (!findAdmin.isAdmin) {

            return console.log("Error : Admin not found")
        }

        const adminPassword = await bcrypt.compare(password, findAdmin.password)

        if (!adminPassword) {

            return console.log("Error : Incorrect password")
        }

        req.session.admin = email;
        res.redirect('/admin/Dashboard')

    } catch (error) {

        console.log(error)
    }


}

const blockUser = async (req, res) => {

    console.log(req.body)

    const findUser = await userModel.findOne({ _id: req.body.userId })
    findUser.isBlock = !findUser.isBlock
    await findUser.save()

    res.send({ success: "user status changed succesfully" })

}

const createCategory = async (req, res) => {

    try {

        console.log(req.body)

        const { name, description } = req.body

        const regex = new RegExp("^" + name + "$", "i");
        const existingCategory = await categoryModel.find({categoryName:regex});

        console.log(existingCategory)

        if(existingCategory.length > 0){
           return res.send({success: false})
        }

        const newCategory = new categoryModel({

            categoryName: name,
            description: description
        })

        await newCategory.save()

        res.send({ success: true })


    } catch (error) {

        console.log(error)
    }

}

const blockCategory = async (req, res) => {

    console.log(req.body)

    const findCategory = await categoryModel.findOne({ _id: req.body.categoryId })

    console.log(findCategory)

    findCategory.isBlock = !findCategory.isBlock
    await findCategory.save()

    res.send({ success: true })
}

const updateCategory = async (req, res) => {

    try {

        const updateCategoryDetails = req.body

        const findCategory = await categoryModel.findOne({ _id: updateCategoryDetails.categoryId })



        findCategory.categoryName = updateCategoryDetails.categoryName
        findCategory.description = updateCategoryDetails.categoryDescription

        await findCategory.save()

        console.log(findCategory)

        res.send({ success: true })

    } catch (error) {

        console.log(error)
    }
}

const createProducts = async (req, res) => {

    try {

        // console.log("this is form data", req.body)
        const { productTitle, productDescription, category, cost, stock } = req.body

        // console.log("Uploaded file info:", req.files);
        const imagePaths = req.files.map(file => `/public/productImages/${file.filename}`)

        const newProduct = new productModel({

            productName: productTitle,
            description: productDescription,
            category: category,
            price: cost,
            stock: stock,
            images: imagePaths

        })

        await newProduct.save()

        // console.log(newProduct)

        res.send({ success: true })


    } catch (error) {

        console.log(error)
    }
}

const blockProduct = async (req, res) => {

    console.log(req.body)

    const findProduct = await productModel.findOne({ _id: req.body.productId })

    console.log(findProduct)

    findProduct.isBlock = !findProduct.isBlock
    await findProduct.save()

    res.send({ success: true })
}

const updateProduct = async (req, res) => {

    try {

        // console.log(req.body)
        const { id, productName, productDescription, category, price, stock } = req.body

        // console.log(req.files)

        const images = [];

        if (req.files.image1) images.push(req.files.image1[0]);
        if (req.files.image2) images.push(req.files.image2[0]);
        if (req.files.image3) images.push(req.files.image3[0]);

        const newProduct = await productModel.findById(id)

        // console.log(images)

        newProduct.productName = productName
        newProduct.description = productDescription
        newProduct.category = category
        newProduct.price = price
        newProduct.stock = stock

        for(let i=0; i < images.length; i++){
            // if(images[i].fieldname == )
            if(images[i].fieldname == 'image1'){
                newProduct.images[0] = `/public/productImages/${images[i].filename}`
            }else if(images[i].fieldname == 'image2'){
                newProduct.images[1] = `/public/productImages/${images[i].filename}`
            }else if(images[i].fieldname == 'image3'){
                newProduct.images[2] = `/public/productImages/${images[i].filename}`
            }
        }

        await newProduct.save()

        res.send({success: true})

    
    } catch (error) {

        console.log(error)
    }
}

const changeProductStatus = async (req, res) => {

    try{
        const { productId, newStatus, orderId } = req.body

        const findOrder = await orderModel.findById(orderId)

        // findOrder.products.forEach(val => console.log(val.product.toString()))

        const find = findOrder.products.find(val => val.product.toString() == productId)

        find.productStatus = newStatus

        const allCancelled = findOrder.products.every(p => p.productStatus === newStatus);

        if (allCancelled) {
            findOrder.orderStatus = newStatus;
        }

        await findOrder.save()

    }catch(error){
        console.log(error)
    }
}

const changeOrderStatus = async (req,res) => {

    try{

        const { orderId, newStatus} = req.body

        if( newStatus.length <= 0 ){
            return console.log('there is no new status to change at change order status')
        }

        if(!orderId){
            return console.log(' cant get order id here at change order status')
        }

        const findOrder = await orderModel.findById(orderId)
        // console.log(findOrder)

        if(!findOrder){
            console.log('cant find the order at change order status')
        }

        findOrder.status = newStatus

        findOrder.products.forEach( val =>{

            val.productStatus = newStatus
        })

        const saveOrder = await findOrder.save()
        // console.log(saveOrder)

        if(saveOrder){
            res.send({ success: true})
        }


    }catch(error){
        console.log(error)
    }
}




module.exports = {

    adminLogin,
    verifyAdminLogin,
    adminDashboard,
    showUsers,
    blockUser,
    showCategories,
    showProducts,
    createCategory,
    blockCategory,
    updateCategory,
    loadCreateProduct,
    createProducts,
    blockProduct,
    showEditproduct,
    updateProduct,
    showOrders,
    orderDetails,
    changeOrderStatus,
    changeProductStatus,
    updateReturnRequest
}