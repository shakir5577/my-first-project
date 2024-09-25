const isLogin = async (req, res, next) => {
    try{
        if(req.session.userId){
            next()
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