
const productModel = require('../../models/productModel')
const categoryModel = require('../../models/categoryModel')
const offerModel = require('../../models/offerModel')


const showOffer = async (req,res) => {

    try{

        const fetchOffers = await offerModel.find({}).populate('productId').populate('categoryId')

        res.render('admin/offer',{ offers: fetchOffers })

    }catch(error){

        console.log(error)
    }
}

const showCreateOffer = async (req,res) => {

    try{

        const fetchCategories = await categoryModel.find({}).sort({ createdAt: 1 })
        const fetchProducts = await productModel.find({}).sort({ createdAt: 1 })

        res.render('admin/createOffer', { products: fetchProducts, categories: fetchCategories})


    }catch(error){
        console.log(error)
    }
}

const createOffer = async (req,res) => {

    try{

        const { offerType, discount,startDate,endDate,productId, categoryId } = req.body

        const newOffer = new offerModel({

            offerType,
            discount,
            startDate,
            endDate,
            productId: offerType === 'product' ? productId : undefined,
            categoryId: offerType === 'category' ? categoryId : undefined
        })

        if( offerType === 'product') {

            const offerId = newOffer.id

            await productModel.findOneAndUpdate(

                { _id: productId },
                { $push: { offers: offerId }},
                { upsert: true, returnOrginal : false}
            );

        }else if( offerType === 'category') {

            const fetchCategory = await categoryModel.findById(categoryId)

            const offerId = newOffer.id

            const product = await productModel.updateMany({ category: fetchCategory.categoryName}, {$push: { offers: offerId}})
        }

        await newOffer.save()
        res.send({ success: true })


    }catch(error){

        console.log(error)
    }
}

const deleteOffer = async (req,res) => {

    try{

        const { offerId } = req.body

        if(!offerId) {
            return console.log("cant get any offer id at delete offer")
        }

        const offer = await offerModel.findById(offerId)

        if(!offer){
            return console.log("offer not find")
        }

        const { offerType, productId, categoryId } = offer;

        const deleting = await offerModel.findByIdAndDelete(offerId)

        if(deleting){

            if(offerType === 'product') {

                await productModel.findByIdAndUpdate(
                    productId,
                    { $pull : { offers: offerId} },
                    { returnOrginal: false}
                );
            }else if(offerType === 'category') {
                const fetchCategory = await categoryModel.findById(categoryId);
                if(fetchCategory) {
                    await productModel.updateMany(
                        { category: fetchCategory.categoryName },
                        { $pull: { offers: offerId }}
                    )
                }
            }

            console.log('deleting offer successfully...')
            res.send({ success: true})

        }else{

            console.log('failed to delete offer')
        }

    }catch(error){
        console.log(error)
    }
}


module.exports = {

    showOffer,
    showCreateOffer,
    createOffer,
    deleteOffer
}