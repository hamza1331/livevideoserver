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
const shopmodelsPath = `${__dirname}/app/models/`;
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

app.use(
  bodyParser.urlencoded({
    extended: true
  })
);
app.use(bodyParser.json());
app.set('socketio', io);
app.set('server', server);
app.use(express.static(`${__dirname}/public`));

server.listen(port, err => {
  if (err) {
    console.log(err);
  } else {
    console.log(`listening on port ${port}`);
  }
});

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
  if(req.body.firebaseUID){
    let data = req.body
    Group.create(data,(err,doc)=>{
      if(err)return res.json({message:"Failed",err})
      else{
        return res.json({message:"Success",doc})
      }
    })
  }else{
    res.json({message:"Failed",error:"Valid FirebaseUID is required"})
  }
})
//get group
app.get('/api/getGroup:firebaseUID',(req,res)=>{
  Group.findOne({firebaseUID:req.params.firebaseUID},(err,doc)=>{
    if(err)return res.json({message:"Failed",err})
    else{
      return res.json({message:"Success",doc})
    }
  })
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