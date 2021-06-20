const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const ios = require('socket.io-express-session');
// const {env} = require('./methods');

const app = express();

let server;

// if (env.env === 'prod') {
//   server = https.createServer({
//     cert: fs.readFileSync(path.resolve(__dirname, env.certFullChainPath)),
//     key: fs.readFileSync(path.resolve(__dirname, env.certPrivateKeyPath)),
//   }, app)
// } else {
  server = http.createServer(app);
// }

const io = require('socket.io')(server);
// const { dbcon, functions,
//   session,
//  } = require('./methods');

// dbcon.connect();

app.set('json spaces', 2);
// app.use(require('helmet')());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true,
}));

// app.use(session);
// io.use(ios(session));

app.use(require('./router.js'));

app.use('/js', express.static('./js'));

app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

io.on('connection', (socket) => {
  if (socket.handshake.headers.referer.split('/')[4]) {
    socket.join(socket.handshake.headers.referer.split('/')[4]);
  }
  let timeout;
  socket.on("update", (data) => {
    io.to(data.name).emit('newUpdate', data);
    clearTimeout(timeout);
    timeout = setTimeout(function () {
      fs.writeFile(`./projects/${data.name}${data.path}`, data.text, (err) => {
        if (err) console.error(err);
        else {
          io.to(data.name).emit('newUpdate', data);
        }
      });
    }, 5000);
  });
});

server.listen(3000);
