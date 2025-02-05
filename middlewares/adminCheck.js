const userModel = require('../models/userModel')

const isLogin = async (req, res, next) => {
    try{
        if(req.session.admin){
            next()
        }else{
            res.redirect('/admin')
        }
    }catch(err){
        console.log(err)
    }
} 

const isLogout = async (req, res, next) => {
    try{
        if(!req.session.admin){
            next()
        }else{
            res.redirect('/admin/dashboard')
        }
    }catch(error){
        console.log(error)
    }
}

module.exports = {
    isLogin,
    isLogout
}
