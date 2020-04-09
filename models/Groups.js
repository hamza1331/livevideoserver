const mongoose = require('mongoose');


const CategorySchema = new mongoose.Schema({
    firebaseUID:{
        required:true,
        type:String
    },
    participants: [String]
});

module.exports = mongoose.model('group', CategorySchema);