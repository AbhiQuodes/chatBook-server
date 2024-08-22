require('dotenv').config();
const mongoose = require('mongoose');
// const chatStore= mongoose.createConnection('mongodb://localhost:27017/chatstore');
const chatStore = mongoose.createConnection(process.env.MONGO_URL+'chatStore'+'?retryWrites=true&w=majority');

// const chatStore = mongoose.createConnection('mongodb+srv://Abhiquodes:studentb08sybcs@chat-application-cluste.0dhd4.mongodb.net/')
// mongoose configuration connection code to be replaced in to another file
const msgSchema = new mongoose.Schema({
    name :String,
    value :  String,
    time  : String
});
const contactSchema = new mongoose.Schema({
    contactName:String
})
const msgPSchema = new mongoose.Schema(
    {
     from :String,
     name:String,
    value :  String,
    time  : String,
     to:String
    }
);


const express= require('express');
const http=require('http');
const socketIo=require('socket.io');
const cors=require('cors');
const { ifError } = require('assert');
// const PORT= process.env.PORT || 8000;
const PORT= process.env.PORT
let userActiv=0;
let userList,i=1;
let app=express();
let message=[],noOfmsg=0,d_no=0;
const server=http.createServer(app);
let user={},params=[];
let accounts={},temp;
let getPdata=[],getContact,getdata;
//join the socket with server
const dataDbread = async () => {
    const message = chatStore.model("message", msgSchema,"message");
    getdata = await message.find();
        return getdata;
  };

//reading the personal chats in the user named database.
  const PdataDbread = async (name) => {
 
    var key =Object.keys(user).find( key => user[key]=== name);
    const db= accounts[key].db;
    var collections = await db.listCollections().toArray();
   //  d_no stands for document no
   for (var collection of collections)

    //  collections.forEach( async (collection,d_no) => 
        {
        // var message =await db.collection(collection.name, msgSchema);
        
        if(collection.name !='Contacts')
        {
        var message = accounts[key].model(collection.name, msgPSchema,collection.name);
        getPdata[d_no] = await message.find();
      d_no++;
}


    }

 
            d_no=0;
           return getPdata;
        
  
  };
// getting contacts in the user named database.
const contactDbread = async (myContact) =>{
    // finding the socket id from user object by matching the  data.name and its associated socket id and 
    // after getting the socket id we are getting the value from the socket uid as key in the accounts object.
    var key= Object.keys(user).find(key => user[key] === myContact);
    // const db= accounts[key].db;
    
    const contacts = (accounts[key]).model('Contacts', contactSchema,'Contacts');
    // const contacts = db.model('Contacts', contactSchema,'Contacts');
     getContact = await contacts.find();
  
        return getContact;

}

const saveMIndb =async(data)=>{

    const message= chatStore.model('message',msgSchema,'message');
    let savingData = new message(data);
    const result=await savingData.save();

};

//saving the personal chats in the user named database.
const savePmIndb =async(name,data,collection_name)=>{
    var key= Object.keys(user).find(key => user[key] === name);
  
    // const message= accounts[key].model(data.name,msgSchema,data.name);
    if(key)
    {
    const message  = accounts[key].model(data.name,msgPSchema,collection_name);
    let savingData = new message(data);
    const result=await savingData.save();
    }
    
};

// saving contacts in the user named database.
const saveCIndb = async (myContact,data) => {
  // finding the socket id from user object by matching the  data.name and its associated socket id and 
    // after getting the socket id we are getting the value from the socket uid as key in the accounts object.
    var key= Object.keys(user).find(key => user[key] === myContact);
    const contacts = (accounts[key]).model('Contacts', contactSchema,'Contacts');
    let savingContact = new contacts(data);
    const result=await savingContact.save();
  };

// const deleteFromDb = async()=>
// {
//     const message= mongoose.model('message',msgSchema);
//     message.deleteMany({})//(err)=>{
//     //     if(err)console.log(err)
//     //         else console.log('all document are deleted');
//     // });
//    await console.log("delted");
// }
// deleteFromDb();

app.get('/',(req,resp)=>{
    resp.send('hello Chatbook Server');
    })


const io =socketIo(server,{

    cors:{
        origin:"*"
    }
});

app.use(cors({
    origin:"*",
    
   }));



// const io=require('socket.io')(8000)
io.on('connection',(socket)=>{
 


    socket.on('me-user-has-joined' ,async(data)=>
    {
        
       user[socket.id]=data.name;
      
       accounts[socket.id]=mongoose.createConnection(process.env.MONGO_URL+(data.name)+'?retryWrites=true&w=majority');
    
       // after me just joining i want me chats and saved contacts 
       // from data base s
       // so reading the data's from below; 

       getdata=await dataDbread();
       // passing the user name so that getting the from the userNamed database.
       getContact = await contactDbread(data.name);
       getPdata= await PdataDbread(data.name);
       
         //for joining of new user;
         userActiv++;
         message[noOfmsg]=data;
        userList=Object.values(user);
      
       socket.emit(data.name, [getdata,getContact,getPdata,{ no:userActiv,type:'li', 
        typeS:'span',
        typeB:'button',
        content:userList  }]);
       socket.broadcast.emit('user-has-joined',data);

        
      
        
        // active user information in object;
        io.emit('noOfuser',{ no:userActiv,type:'li', 
            typeS:'span',
            typeB:'button',
            content:userList  });
        
           i++;
            // console.log(message);
            if(data != undefined)
            {
                saveMIndb(data);
            }
     

    });
 
    socket.on('message',(data)=>{
      
        message[noOfmsg]=data;
        socket.broadcast.emit('message',(data));

        saveMIndb(data);
        noOfmsg++;
           
    });

    socket.on('offer',(offer,room)=>{
         socket.broadcast.to(room).emit('offer',offer);
    })
    socket.on('ice-candidate',(candidate,room)=>{
        socket.broadcast.to(room).emit('ice-candidate',candidate);
    })

 
    socket.on('answer',(answer,room)=>{
        socket.broadcast.to(room).emit('answer',answer);
    })
    socket.on('media-error-call-Nconnect',(room,error)=>{
        socket.broadcast.to(room).emit('media-error-call-Nconnect',error);
    })

    socket.on('close-connection',(room)=>{
        socket.broadcast.to(room).emit('close-connection');
    })

    socket.on('accessMedia',(room)=>{
        socket.broadcast.to(room).emit('accessMedia',room);
    })
    socket.on('saveContact',(myContact,data)=>{
        saveCIndb(myContact,data);
    })
    socket.on('join-room',(room)=>{
        
            // room is the object sent by the client
              socket.join(room);
        //   console.log(`socket ${socket.id} and ${room} joined with ${contactName}`)    
              //here giving the room name as the front and user name in alphabetical sorted sequence separated by hyphen.
        
    })
    socket.on('personalMsg',(name,data,room)=>{
        let exchange;
        // name is the sender name and data.name is the person to whom sending.
        // sender ka name islye use kiya h usse pata chalega ki kiske database me save karna h .
         socket.broadcast.to(room).emit('personalMsg',[data,name]);
        savePmIndb(name,data,data.name);
        //  the first parameter is database name
        // the third parameter is the collection name;


        if(name != (data.name))
        {
            // exchange=data.name;
            // data.name=name;
            // name=exchange;
            savePmIndb(data.name,data,name);
            
        }
        
        
        //receiver  k data base me save hona chahiye.

    })
    socket.on('disconnect',()=>{
        name =user[socket.id];
        delete user[socket.id]
        userActiv--;
        userActiv <0 ? (userActiv=0) : (userActiv); 
        
        data={
            name,
            value:'left',
            time :(new Date).toLocaleString()
        }
        message[noOfmsg]=data;
        userList=Object.values(user);
        socket.broadcast.emit('user-has-left',(data));
        
        io.emit('noOfuser',{  no:userActiv,type:'li', 
            content:userList
        });
        
        
       
            
   
        // console.log(message);
        saveMIndb(data);
        noOfmsg++;
    })
   
});




server.listen(PORT);