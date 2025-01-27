

const mongoose = require("mongoose")
const findOrCreate = require("mongoose-findorcreate")
const userSchema = mongoose.Schema({

    name:{type:String,required:true},
    email:{type:String,required:true},
    googleId:{type:String},
    number:{type:Number},
    password:{type:String},
    balance:{type:Number,default:0},
    createdAt:{type:Date,default:Date.now},
    isAdmin:{type:Boolean,default:false},
    isBlock:{type:Boolean,default:false},
    resetPasswordToken:{type:String},
    resetPasswordExpires:{type:Date}

});

userSchema.plugin(findOrCreate)

const userModel = mongoose.model("myUsers",userSchema)
module.exports = userModel;