

const userModel = require('../models/userModel')
const categoryModel = require('../models/categoryModel')
const productModel = require('../models/productModel')
const bcrypt = require("bcrypt")


const adminLogin = async (req, res) => {

    res.render('admin/adminLogin')
}

const adminDashboard = async (req, res) => {

    res.render('admin/adminDashboard')
}

const showUsers = async (req, res) => {

    const allUsers = await userModel.find()

    res.render('admin/users', { allUsers: allUsers })
}

const showCategories = async (req, res) => {

    const allCategories = await categoryModel.find()
    res.render('admin/categories', { allCategories: allCategories })
}

const showProducts = async (req, res) => {

    const allProducts = await productModel.find()
    res.render('admin/products', { allProducts: allProducts })
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

    res.render('admin/orders')
}




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
    showOrders
}