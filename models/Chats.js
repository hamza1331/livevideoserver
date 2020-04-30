// TVHQFhJ3JZfs260fbfO6RIwRtz83
const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    createdAt:{
        type:String,
        default:Date.now()
    },
    text:{
        type:String
    },
    image:{
        type:String
    },
    senderAvatarLink:{
        type:String,
        default:'https://placeimg.com/140/140/any'
    },
    senderID:{
        type:String,
        required:true
    }
})

const ChatsSchema = new mongoose.Schema({
    messages:{
    type:[MessageSchema]
    },
    firebaseUID:{
    type:String
    },
    sellerUserID:{
        type:String
    },
    sellerProfilePic:{
        type:String,
        default:'https://placeimg.com/140/140/any'
    },
    sellerFname:{         //seller
        type:String
    },
    buyerProfilePic:{
        type:String,
        default:'https://placeimg.com/140/140/any'
    },
    buyerFname:{         //seller
        type:String
    },
});

module.exports = mongoose.model('Chats', ChatsSchema);