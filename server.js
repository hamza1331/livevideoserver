const { NodeMediaServer } = require('node-media-server');
const express = require('express');
const mongoose = require('mongoose');

const app = express();
const http = require('http');
const fs = require('fs');
const bodyParser = require('body-parser');
const path = require('path');
const utils = require('./app/utils');
const process = require('process')
const port = process.env.PORT || 5000
const Group = require('./models/Groups')
const cors = require('cors')
const Chats = require('./models/Chats')
const shopmodelsPath = `${__dirname}/app/models/`;
var admin = require("firebase-admin");

var serviceAccount = require('./onlinevideolectures-firebase-adminsdk-nehr6-99e8909133.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://onlinevideolectures.firebaseio.com"
});
fs.readdirSync(shopmodelsPath).forEach(file => {
  if (~file.indexOf('.js')) {
    require(`${shopmodelsPath}/${file}`);
  }
});

const server = http.createServer(app);
const io = require('socket.io').listen(server);
require('./app/controllers/socketIO')(io);
mongoose.Promise = global.Promise;
global.appRoot = path.resolve(__dirname);

mongoose.connect(
  "mongodb://demo:demo123@ds125372.mlab.com:25372/demo_dreamerz",
  { useNewUrlParser: true },
  err => {
    if (err) {
      console.log(err);
    } else {
      console.log('Connected to the database: ');
    }
  }
);
app.use(cors())
app.use(
  bodyParser.urlencoded({
    extended: true
  })
);
app.use(bodyParser.json());
app.set('socketio', io);
app.set('server', server);
app.use(express.static(`${__dirname}/public`));

// server.listen(port, err => {
//   if (err) {
//     console.log(err);
//   } else {
//     console.log(`listening on port ${port}`);
//   }
// });

const nodeMediaServerConfig = {
  rtmp: {
    port: 1935,
    chunk_size: 60000,
    gop_cache: true,
    ping: 60,
    ping_timeout: 30
  },
  http: {
    port: 8000,
    mediaroot: './media',
    allow_origin: '*'
  },
  trans: {
    ffmpeg: '/usr/local/bin/ffmpeg',
    tasks: [
      {
        app: 'live',
        ac: 'aac',
        mp4: true,
        mp4Flags: '[movflags=faststart]'
      }
    ]
  }
};

var nms = new NodeMediaServer(nodeMediaServerConfig);
nms.run();
nms.on('getFilePath', (streamPath, oupath, mp4Filename) => {
  console.log('---------------- get file path ---------------');
  console.log(streamPath);
  console.log(oupath);
  console.log(mp4Filename);
  utils.setMp4FilePath(oupath + '/' + mp4Filename);
});

nms.on('preConnect', (id, args) => {
  console.log(
    '[NodeEvent on preConnect]',
    `id=${id} args=${JSON.stringify(args)}`
  );
});

nms.on('postConnect', (id, args) => {
  console.log(
    '[NodeEvent on postConnect]',
    `id=${id} args=${JSON.stringify(args)}`
  );
});

nms.on('doneConnect', (id, args) => {
  console.log(
    '[NodeEvent on doneConnect]',
    `id=${id} args=${JSON.stringify(args)}`
  );
});

nms.on('prePublish', (id, StreamPath, args) => {
  console.log(
    '[NodeEvent on prePublish]',
    `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`
  );
});

nms.on('postPublish', (id, StreamPath, args) => {
  console.log(
    '[NodeEvent on postPublish]',
    `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`
  );
});

nms.on('donePublish', (id, StreamPath, args) => {
  console.log(
    '[NodeEvent on donePublish]',
    `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`
  );
});

nms.on('prePlay', (id, StreamPath, args) => {
  console.log(
    '[NodeEvent on prePlay]',
    `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`
  );
});

nms.on('postPlay', (id, StreamPath, args) => {
  console.log(
    '[NodeEvent on postPlay]',
    `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`
  );
});

nms.on('donePlay', (id, StreamPath, args) => {
  console.log(
    '[NodeEvent on donePlay]',
    `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`
  );
});

//**Manage Groups**

//create group
app.post('/api/addGroup',(req,res)=>{
  let auth = admin.auth()
  auth.createUser({
    displayName:req.body.name,
    email:req.body.email,
    password:req.body.password
  }).then((response)=>{
    let uid = response.uid
    let user = {
      email:response.email,
      password:req.body.password,
      displayName:req.body.name,
      userType:1,
      firebaseUID:uid
    }
    let database = admin.database().ref('users').child(uid)
    database.set(user).then((result)=>{
      Chats.create({firebaseUID:uid},(err,doc)=>{
        if(err)return res.json({message:"Failed",err})

        let group = {
          groupName:req.body.groupName,
          firebaseUID:response.uid,
          adminName:req.body.name,
          chatId:doc._id
         }
         Group.create(group,(error,group)=>{
           if(error)return res.json({message:"Failed",error})
           else{
             return res.json({message:"Success",doc:group})
           }
         })
      })
    })
  }).catch(err=>res.json({message:'Failed',err}))
})
//get group
app.get('/api/getGroup:firebaseUID',(req,res)=>{
  Group.findOne({firebaseUID:req.params.firebaseUID},(err,doc)=>{
    if(err)return res.json({message:"Failed",err})
    else{
      console.log(doc)
      return res.json({message:"Success",doc})
    }
  })
})
app.post('/api/getGroups',(req,res)=>{
  if(req.body.groups){
    let data = req.body
    if(data.groups.length>0){
      let {groups} = req.body
      Group.find({firebaseUID:{$in:groups}},(err,docs)=>{
        if(err)return res.json({message:"Failed",err})
        else{
          return res.json({message:"Success",docs})
        }
      })
    }
    else{
    return res.json({message:"Failed",err:"Group IDs must not be empty"})
    }
  }
  else{
    return res.json({message:"Failed",err:"Group IDs are required"})
  }
})
//add participants
app.put('/api/addParticipant',(req,res)=>{
  if(req.body.firebaseUID){
    let data = req.body
    Group.findOneAndUpdate({firebaseUID:data.firebaseUID},{$push:{participants:data.userId}},{new:true},(err,doc)=>{
      if(err)return res.json({message:"Failed",err})
    else{
      return res.json({message:"Success",doc})
    }
    })
  }else{
    res.json({message:"Failed",error:"Valid FirebaseUID is required"})
  }
})

//remove participants
app.put('/api/removeParticipant',(req,res)=>{
  if(req.body.firebaseUID){
    let data = req.body
    Group.findOneAndUpdate({firebaseUID:data.firebaseUID},{$pull:{participants:data.userId}},{new:true},(err,doc)=>{
      if(err)return res.json({message:"Failed",err})
    else{
      return res.json({message:"Success",doc})
    }
    })
  }else{
    res.json({message:"Failed",error:"Valid FirebaseUID is required"})
  }
})

//Chats
app.post('/api/getMessages', (req, res) => {         //get messages of a chat from listing
  let data = req.body
  Chats.findOne({chatId:data.chatId},(err,doc)=>{
    if(err)return res.json({message:"Failed",err})
    else{
      return res.json({message:"Success",doc})
    }
  })
})

//Get all users 
app.get('/api/getAllUsers',(req,res)=>{
  console.log('requesdih')
  let  users = []
  let database = admin.database().ref('users/')
  database.once('value',(response)=>{
    response.forEach((resp)=>{
        let user = resp.val()
        users.push(user)
    })
     res.json({message:"Success",doc:users})
  })
})

//Get all groups
app.post('/api/getAllGroups',(req,res)=>{
  Group.find({},(err,docs)=>{
    if(err)return res.json({message:"Failed",err})
    else{
      return res.json({message:"Success",doc:docs})
    }
  })
})

//Delete a group
app.delete('/api/deleteGroup',(req,res)=>{
  if(req.body.firebaseUID){
    let uid = req.body.firebaseUID
    let auth = admin.auth()
    auth.deleteUser(uid).then((response)=>{
      let database = admin.database().ref('users').child(uid)
      database.remove().then((result)=>{
          Group.findOneAndDelete({firebaseUID:uid},(err,doc)=>{
            if(err)return res.json({message:"Failed",err})
            else{
              return res.json({message:"Success",doc})
            }
          })
      })
    })
  }else{
    return res.json({message:"Failed",err:"Group can not be null"})
  }
})

//Delete User

app.delete('/api/deleteUser',(req,res)=>{
  if(req.body.uid){
    let uid = req.body.uid
    let auth = admin.auth()
    auth.deleteUser(uid).then(()=>{
      let database = admin.database().ref('users').child(uid)
      database.remove(()=>{
        return res.json({message:"Success"})
      }).catch(error=>res.json({message:"Failed",error}))
    }).catch(err=>res.json({message:"Failed",err}))
  }else{
    return res.json({message:"Failed",err:"User can not be null"})
  }
})

//Add User
app.post('/api/addUser',(req,res)=>{
  if(req.body.name){
    let auth = admin.auth()
    auth.createUser({
      email:req.body.email,
      password:req.body.password,
      displayName:req.body.name
    }).then(response=>{
      let uid = response.uid
      let user = {
        email:response.email,
        password:req.body.password,
        displayName:req.body.name,
        userType:0,
        firebaseUID:uid
      }
      let database = admin.database().ref('users').child(uid)
      database.set(user).then((result)=>{
        return res.json({message:"Success",doc:user})
      })
    }).catch(err=>res.json({message:'Failed',err}))
  }else{
    return res.json({message:"Failed",err:"User can not be null"})
  }
})

app.listen(port,()=>console.log('Listening on port '+port))