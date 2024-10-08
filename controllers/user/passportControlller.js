
const User = require('../../models/userModel');

const successGoogleLogin = async (req, res) => {
    try {
        if (!req.user) {

            return res.redirect('/failure');
        }

    
        req.session.userId = req.user._id;

        console.log(req.user)

        res.redirect('/');
    } catch (error) {
        console.log(error.message);
        res.redirect('/failure');
    }
}

const failureGoogleLogin = (req, res) => {
    try {
        res.redirect('/login');
    } catch (error) {
        console.log(error.message);
    }
}

module.exports = {
    successGoogleLogin,
    failureGoogleLogin
};