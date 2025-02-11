

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

    try{

        const salesData = await orderModel.aggregate([
            {
                $match: { status: 'Delivered' }
            },
            {
                $group: {
                    _id: { $month: "$date" },
                    totalSales: { $sum: "$totalAmount" }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);

        // console.log('sales data: ', salesData)
        

        //initiles all months
        const monthNames = ["Jan","Feb","Mar","Apr","May","Jun",'Jul',"Aug","Sep","Oct","Nov","Dec"]
        const salesValues = new Array(12).fill(0)

        //populate sales values based on data
        salesData.forEach(item => {
            salesValues[item._id - 1] = item.totalSales
        })

        // console.log('sales value array: ', salesValues)

        //count total delivered orders
        const totalOrders = await orderModel.countDocuments({
            status : 'Delivered'
        })

        // console.log('totalorder count: ', totalOrders)

        

        //calculate total revenue
        const totalRevenue = salesValues.reduce((sum, value) => sum + value, 0)
        // console.log('total rev: ', totalRevenue)

        //count total products
        const totalProducts = await productModel.countDocuments({})

        // console.log('total products: ', totalProducts)

        //get best selling products
        const bestSellingProducts = await orderModel.aggregate([

            {
                $match: { status: 'Delivered' }
            },
            {
                $unwind: '$products'
            },
            {
                $group: {
                    _id: '$products.product',
                    totalSold: { $sum: '$products.quantity' }
                }
            },
            {
                $sort: { totalSold: -1 }
            },
            {
                $limit: 5
            }
        ])

        // console.log('best sell: ', bestSellingProducts)
        

        //fetch products details for best selling products
        const productIds = bestSellingProducts.map(p => p._id)
        const products = await productModel.find({ _id: { $in: productIds } }).select('productName')
        // console.log('names of pro: ', products)

        //map product details to best selling data
        // no need 
        const bestSellingDetails = bestSellingProducts.map(selling => {
            const product = products.find(p => p._id.toString() === selling._id.toString())
            return{
                name: product ? product.productName : "Unknown Product",
                count : selling.totalSold
            }
        })

        // console.log('best selling details: ', bestSellingDetails)

        const topCategories = await orderModel.aggregate([
            {
                $match: { status: 'Delivered' }
            },
            {
                $unwind: "$products"
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'products.product',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            {
                $unwind: "$productDetails"
            },
            {
                $group: {
                    _id: "$productDetails.category",
                    totalSold: { $sum: "$products.quantity" },
                    products: { $push: { name: "$productDetails.productName", productId: "$productDetails._id" } }
                }
            },
            {
                $sort: { totalSold: -1 }
            },
            {
                $limit: 5
            }
        ]);
         

        //map category data
        const categoryProducts = await Promise.all(
            topCategories.map(async (category) => {
                // Check if products exist and are an array
                const topProductsInCategory = Array.isArray(category.products) ? category.products.slice(0, 5) : [];
        
                return {
                    category: category._id,
                    totalSold: category.totalSold,
                    products: await Promise.all(topProductsInCategory.map(async (p) => {
                        const totalSold = await orderModel.aggregate([
                            { $match: { "products.product": p.productId, status: 'Delivered' } },
                            { $unwind: "$products" },
                            { $match: { "products.product": p.productId } },
                            { $group: { _id: null, totalSold: { $sum: "$products.quantity" } } }
                        ]).then(result => result[0]?.totalSold || 0);
        
                        return { name: p.name, totalSold };
                    }))
                };
            })
        );
        
        console.log(categoryProducts)
        res.render('admin/adminDashboard',{
            totalOrders,
            totalRevenue:totalRevenue.toFixed(2),
            totalProducts,
            bestSellingProducts: bestSellingDetails,
            topCategories: categoryProducts,
            salesLabels: JSON.stringify(monthNames),
            salesData: JSON.stringify(salesValues)
        })

    }catch(error){
        console.log(error)
    }

}



const showUsers = async (req, res) => {

   try{

    const page = parseInt(req.query.page) || 1
    const limit = 5
    const skip = (page - 1) * limit

    const allUsers = await userModel.find().sort({ createdAt: -1 }).limit(limit).skip(skip);
    const totalUsers = await userModel.countDocuments();
    const totalPages = Math.ceil(totalUsers / limit);

    res.render('admin/users', { allUsers: allUsers,currentPage: page, totalPages })

   }catch(error){
    console.log(error)
   }
}

const showCategories = async (req, res) => {

    try{

    const page = parseInt(req.query.page) || 1
    const limit = 5
    const skip = (page - 1) * limit


    const allCategories = await categoryModel.find().sort({ createdAt: -1 }).limit(limit).skip(skip)
    const totalCategories = await categoryModel.countDocuments()
    const totalPages = Math.ceil( totalCategories / limit )

    res.render('admin/categories', { allCategories: allCategories, currentPage: page, totalPages })

    }catch(error){
    console.log(error)
    }
}

const showProducts = async (req, res) => {

    try{

    const page = parseInt(req.query.page) || 1
    const limit = 8
    const skip = (page - 1) * limit

    const allProducts = await productModel.find().sort({ createdAt: -1 }).limit(limit).skip(skip);
    const totalProducts = await productModel.countDocuments();
    const totalPages = Math.ceil(totalProducts / limit);
    res.render('admin/products', { allProducts: allProducts,currentPage: page, totalPages })

    }catch(error){
    console.log(error)
    }
}

const loadCreateProduct = async (req, res) => {

    try{

    const allCategories = await categoryModel.find()
    res.render('admin/createProduct', { allCategories: allCategories })

    }catch(error){
    console.log(error)
    }

}

const showEditproduct = async (req, res) => {

   try{
    const product = await productModel.findById(req.query.id)


    const allCategories = await categoryModel.find()

    res.render('admin/editProduct', { product: product, allCategories:allCategories })

   }catch(error){
    console.log(error)
   }
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
        // console.log('hhhhhha')
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
                type: 'credit',
                orderId
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
    console.log('body: ', req.body);

    try {
        const { email, password } = req.body;
        const findAdmin = await userModel.findOne({ email: email });

        if (!findAdmin) {
            return res.status(404).json({ success: false, message: "Access denied. Not an admin."});
        }

        if (!findAdmin.isAdmin) {
            return res.status(403).json({ success: false, message: "Access denied. Not an admin." });
        }

        const adminPassword = await bcrypt.compare(password, findAdmin.password);

        if (!adminPassword) {
            return res.status(401).json({ success: false, message: "Incorrect password" });
        }

        req.session.admin = email;
        res.status(200).json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error. Please try again later." });
    }
};


const blockUser = async (req, res) => {

   try{
    console.log(req.body)

    const findUser = await userModel.findOne({ _id: req.body.userId })
    findUser.isBlock = !findUser.isBlock
    await findUser.save()

    res.send({ success: "user status changed succesfully" })

   }catch(error){
    console.log(error)
   }

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

   try{
    console.log(req.body)

    const findCategory = await categoryModel.findOne({ _id: req.body.categoryId })


    console.log(findCategory)

    findCategory.isBlock = !findCategory.isBlock
    await findCategory.save()

    res.send({ success: true })

   }catch(error){
    console.log(error)
   }
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

   try{
    console.log(req.body)

    const findProduct = await productModel.findOne({ _id: req.body.productId })

    console.log(findProduct)

    findProduct.isBlock = !findProduct.isBlock
    await findProduct.save()

    res.send({ success: true })

   }catch(error){
    console.log(error)
   }
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

    // console.log('haaai')

    try{
        const { productId, newStatus, orderId } = req.body

        const findOrder = await orderModel.findById(orderId)

        // findOrder.products.forEach(val => console.log(val.product.toString()))

        const find = findOrder.products.find(val => val.product.toString() == productId)
        
        find.productStatus = newStatus


        // const allCancelled = findOrder.products.every(p => p.productStatus === newStatus);

        // findOrder.status = newStatus;

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

const adminLogout = async (req, res, next) => {
    try {

        // Destroy the session
        req.session.destroy((err) => {
            if (err) {
                next(err);
            } else {
                res.redirect('/admin');
            }
        });
    } catch (error) {
        next(error);
    }
};




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
    updateReturnRequest,
    adminLogout
}