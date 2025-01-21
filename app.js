
const express = require('express');
const path = require("path")
const flash = require("connect-flash")
const session = require('express-session')
const passport = require('passport')
const userRouter = require('./routes/userRouter')
const adminRouter = require('./routes/adminRouter')
const nocache = require("nocache")

require('dotenv').config()
require('./config/passport')
//----------------------------------------------------
const mongoose = require('mongoose')
mongoose.connect("mongodb+srv://shakirkm808:nj3o7VuPByGZljdD@cluster0.gauoa.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
    .then(()=> console.log("connected with mongodb"))
    .catch(err => console.log("error connecting mongodb: ", err))

//------------------------------------------------------    

const app = express();                             
app.use(express.urlencoded({extended:true}))
app.use(express.json())

//----------------------------------------

app.use(nocache())

//-----------------

app.use(session({

    secret : 'shaky',
    resave : false,
    saveUninitialized :false,
}))

//---------------------------

app.use(passport.initialize());
app.use(passport.session())

//---------------------------

app.use(flash())

//-----------------


//set the view engine to EJS
app.set('view engine','ejs')
app.set('views',path.join(__dirname,'views'))

//-------------------------------------------

//directories
app.use(express.static('public/user'));
app.use(express.static('public/admin'));
app.use('/admin',express.static('public/admin'))
app.use('/orderDetailes',express.static('public/user'))
app.use('/public', express.static('public/admin'));
app.use('/public', express.static('public'))
// app.use('/', express.static('public'))


//---------------------------------------------

app.use((req,res,next)=> {

    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    next()
})

//--------------------------------------------------

//use the admin route
app.use('/admin',adminRouter)
//----------------------

//use the user route
app.use('/',userRouter);
//-------------------------


//start server
app.listen(7000, () => {
    console.log('Server is running on port 7000');
});

