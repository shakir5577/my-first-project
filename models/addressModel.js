
const mongoose = require("mongoose")
const addressSchema = new mongoose.Schema({

    userId: {
        type:mongoose.Schema.Types.ObjectId
    },

    address: [
        {
            name:{ 
                type:String,
                required:true
            },
            number:{ 
                type:String,
                required:true
            },
            street:{ 
                type:String,
                required:true
            },
            city:{ 
                type:String,
                required:true
            },
            state:{ 
                type:String,
                required:true
            },
            pin:{ 
                type:String,
                required:true
            },
            country:{ 
                type:String,
                required:true
            },


        }
    ]

});

const addressModel = mongoose.model("usersAddress",addressSchema)
module.exports = addressModel;