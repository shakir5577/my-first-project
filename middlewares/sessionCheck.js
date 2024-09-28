const userModel = require('../models/userModel')

const isLogin = async (req, res, next) => {
    try{
        if(req.session.userId){

            const findUser = await userModel.findById(req.session.userId)

            if(findUser.isBlock){
               res.render('user/userLogin',{messsage: "Your account has been blocked."})
            }else{

                next()
            }
        }else{
            res.redirect('/login')
        }
    }catch(error){
        console.log(error)
    }
}

const isLogout = async (req, res, next) => {
    try{
        if(!req.session.userId){
            next()
        }else{
            res.redirect('/')
        }
    }catch(error){
        console.log(error)
    }
}

module.exports = {
    isLogin,
    isLogout
}