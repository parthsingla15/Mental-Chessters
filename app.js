const express=require('express');
const socket=require('socket.io');
const http=require('http');
const{ Chess }=require('chess.js')
const path=require("path");
const { log } = require('console');

const app=express();
const server=http.createServer(app)
const io=socket(server);

const chess= new  Chess();

let player={};
let currentPlayer='W';

app.set('view engine','ejs');
app.use(express.static(path.join(__dirname,"public")));

app.get('/',(req,res)=>{
    res.render('index');

})
 
io.on('connection',(uniquesocket)=>{
console.log('connected');

if(!player.white){
    player.white=uniquesocket.id;
    uniquesocket.emit('playerRole','W')
}
else if(!player.black){
    player.black=uniquesocket.id;
    uniquesocket.emit('playerRole','b');
}
else{
    uniquesocket.emit('spectatorRole')
}

uniquesocket.on('disconnect',()=>{
    if(uniquesocket.id==player.white){
        delete player.white;
    }
    else if(uniquesocket.id==player.black){
        delete player.black;
    }
  
});

uniquesocket.on('move',(move)=>{
    try{
        if(chess.turn()=='W'&& uniquesocket.id!==player.white)return;
        if(chess.turn()=='b'&& uniquesocket.id!==player.black)return;

        const result=chess.move(move);
        if(result){
            currentPlayer=chess.turn();
            io.emit('move',move);

            io.emit('boardState',chess.fen())
        }
        else{
            console.log(error);
            uniquesocket.emit('invalidmove',move)
        }


    }catch(err){
        console.log('invalid move');
        uniquesocket.emit('invalidmove',move)

    }
})

});



server.listen(3000,()=>{
    console.log('server is active');
});




