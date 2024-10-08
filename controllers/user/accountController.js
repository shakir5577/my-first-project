const userModel = require('../../models/userModel')
const addressModel = require('../../models/addressModel')
const orderModel = require('../../models/orderModel')
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

        const {userId} = req.session
        const findOrder = await orderModel.find({user: userId})
        // console.log(findOrder)

        res.render('user/myaccountOrders',{orders:findOrder})


    } catch (error) {

        console.log(error);

    }
}

const orderDetailes = async (req,res) => {

    try{

        console.log(req.query)
        const { id } = req.query

        const findOrder = await orderModel.findById(id).populate('products.product')

        res.render('user/orderDetailes',{order:findOrder})

    }catch(error){
        console.log(error)
    }
}


const cancelOrder = async (req, res) => {

    try {

        const { orderId, productId } = req.body

        const { userId } = req.session

        if (!orderId || !productId) {
            return console.log("can't get order id and product id at cancel single product")
        }

        const findOrder = await orderModel.findById(orderId )

        if (!findOrder) {
            return console.log("can't find order at cancel single products")
        }

        const product = findOrder.products.find(val => val.product == productId)

        if (!product) {
            return console.log("can't find product at cancel single products")
        }

        product.productStatus = 'Cancelled'

        const allCancelled = findOrder.products.every(p => p.productStatus === 'Cancelled');
        if (allCancelled) {
            findOrder.orderStatus = 'Cancelled';
        }

        const saveCancel = await findOrder.save()

    if(saveCancel){
        res.send({success: true})
    }

    } catch (error) {

        console.log(error);

    }
}


const showAddress = async (req, res) => {

    try {

        const { userId } = req.session

        const findAddress = await addressModel.findOne({userId : userId})

        let address

        if (!findAddress) {
            // res.render('user/useraccount', {userDetails: findUserDetails, user: userId, referalLink: referalLink })
            address = []
        } else {
            address = findAddress.address
        }
        
        res.render('user/myaccountAddress',{address: address})


    } catch (error) {

        console.log(error);

    }
}

const showAccountDetails = async (req,res) => {

    try{
        const { userId } = req.session

        const findUser = await userModel.findById(userId)

        res.render('user/accountDetails',{findUser: findUser})
    }catch(error){

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
                res.send({success:true})
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
        

        res.send({success:true})


    } catch (error) {

        console.log(error)
    }
}

const editAddress = async (req,res) => {

    try{

        // console.log(req.body)


        const {addressId, userName, userNumber, userStreet, userCity, userState, userPin, userCountry } = req.body
        const { userId } = req.session

        const findUser = await addressModel.findOne({userId : userId})

        if(findUser){
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
        res.send({success:true})
        // console.log(findUser)
    }catch(error){

        console.log(error)
    }
}

const deleteAddress = async(req,res) => {

    try{

        // console.log(req.session)
        // console.log(req.body)
        
        const {id} = req.body
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
        
        res.send({success: true})


    }catch(error){
        console.log(error)
    }
}

const editAccount = async (req,res) => {

    try{

        const {userName,userNumber} = req.body
        const {userId} = req.session

        const findAccount = await userModel.findOne({_id: userId})
        // console.log(findAccount)

        findAccount.name = userName
        findAccount.number = userNumber

        const update = await findAccount.save()
        res.send({success:true})

        if(update){

            console.log("updated..")
            
        }

        // console.log(req.body)
        // console.log(req.session)


    }catch(error){
        console.log(error)
    }
}

const changePassword = async (req,res) => {

    try{

        // console.log(req.body)
        const {userId,oldPassword,newPassword} = req.body
        const findUser = await userModel.findById(userId)
        if (!findUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        // console.log(userId)
        // console.log(findUser)

        const isMatch = await bcrypt.compare(oldPassword,findUser.password)
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Old password is incorrect' });
        }
        // console.log(isMatch)

        const hashedPassword = await bcrypt.hash(newPassword,10)
        // console.log(hashedPassword)

        findUser.password = hashedPassword
        await findUser.save()
        res.send({success:true})


    }catch(error){
        res.status(500).json({ success: false, message: 'Server error' });
    }
}

const logout = async (req,res,next) => {

    try{

        const des = req.session.destroy();
        res.redirect('/login')
    }catch(error){
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
    cancelOrder
}