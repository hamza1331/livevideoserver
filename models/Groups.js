const mongoose = require('mongoose');
const Schema = mongoose.Schema

const CategorySchema = new mongoose.Schema({
    firebaseUID:{
        required:true,
        type:String
    },
    participants: [String],
    groupName:{
        required:true,
        type:String
    },
    adminName:{
        required:true,
        type:String
    },
    chatId:{
        type:Schema.Types.ObjectId,
        ref:"chats"
    }
});

module.exports = mongoose.model('group', CategorySchema);