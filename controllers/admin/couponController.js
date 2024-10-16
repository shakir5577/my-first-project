
const couponModel = require('../../models/couponModel')
const otpGenerator = require('otp-generator')

const showCoupon = async (req,res) => {

    try{

        const page = parseInt(req.query.page) || 1
        const limit = 5
        const skip = (page - 1) * limit

        const findAllCoupons = await couponModel.find().sort({ createdAt : 1 }).limit(limit).skip(skip)
        const totalCoupons = await couponModel.countDocuments();
        const totalPages = Math.ceil(totalCoupons / limit)

        res.render('admin/coupon',{ coupons: findAllCoupons, currentPage: page, totalPages })

    }catch(error){
        console.log(error)
    }
}

const showCreateCoupon = async (req,res) => {

    try{

        res.render('admin/createCoupon')
        
    }catch(error){
        console.log(error)
    }
}

const createCoupon = async (req,res) => {

    try{

        const { name, amount, startDate, endDate, minPurchaseAmount, description} = req.body
        
        const existingCoupon = await couponModel.findOne({ name : name })

        if(existingCoupon) {
            console.log("this coupon already exist...")
            return res.send({error: true})
        }

        const code = otpGenerator.generate(6, { lowerCaseAlphabets: false, specialChars: false, upperCaseAlphabets: false })

        const newCoupon = new couponModel({

            name: name,
            code: name.toUpperCase() + code,
            description: description,
            discountAmount: amount,
            startDate: startDate,
            endDate: endDate,
            minPurchaseAmount: minPurchaseAmount

        })

        const saveNewCoupon = await newCoupon.save()

        // console.log(saveNewCoupon)

        if(saveNewCoupon){

            console.log("success created new coupon...")
            res.send({success: true})
        }

    }catch(error){
        console.log(error)
    }
}

const deleteCoupon = async (req,res) => {

    try{

        const {couponId} = req.body
        
        if(!couponId){
            return console.log("can't get any coupon id at delete coupon...")
        }

        const deleting = await couponModel.findByIdAndDelete(couponId)

        if(deleting){
            console.log('deleting coupon success...')
            res.send({ success:true })
        }


    }catch(error){
        console.log(error)
    }
}

const loadEditCoupon = async (req,res) => {

    try{

        const {couponId} = req.query;

        if(!couponId){
            return res.status(400).send({ error: 'coupon id is required...'})
        }

        const coupon = await couponModel.findById(couponId)

        if (!coupon) {
            return res.status(404).send({ error: 'Coupon not found' });
        }

        res.render('admin/editCoupon',{ coupon })

    }catch(error){
        console.log(error)
    }
}

const editCoupon = async (req,res) => {

    try{

        const { couponId, name, amount, startDate, endDate, minPurchaseAmount, description} = req.body

        const existingCoupon = await couponModel.findOne({name:name})

        if(existingCoupon){

            console.log("another coupon with with this name already exist")
            return res.send({ error: "another coupon with with this name already exist"})
        }

        const updatedCoupon = await couponModel.findByIdAndUpdate(

            couponId,
            {

                $set: {

                    name: name,
                    description: description,
                    discountAmount: amount,
                    startDate: startDate,
                    endDate: endDate,
                    minPurchaseAmount: minPurchaseAmount
                }
            },

            { new : true }

        )

        if(updatedCoupon){

            console.log("successfully updated coupon...")
            res.send({ success: "successfully updated coupon..."})

        }else{

            console.log("Coupon not found");
            res.send({ error: "Coupon not found" }); 
        }

    }catch(error){
        console.log(error)
    }
}

module.exports = {

    showCoupon,
    showCreateCoupon,
    createCoupon,
    deleteCoupon,
    loadEditCoupon,
    editCoupon
}