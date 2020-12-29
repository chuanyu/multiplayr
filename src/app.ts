import * as express from 'express';
import * as http from 'http';
import * as socketio from 'socket.io';
import * as fs from 'fs';

const app = express();
const server = http.createServer(app);
const io = new socketio.Server(server);
const rootDir = __dirname;

app.set('port', process.env.PORT || 3000);
app.set('view options', { layout: false, pretty: true });
app.use(express.static(rootDir + '/client/'));

/**
 * Routes
 */

app.get('/', (req, res) => {
    res.redirect('/host');
});

const paths = {
    'host': 'host.html',
    'join': 'join.html',

    'theoddone': 'theoddone.html',
    'decrypto': 'decrypto.html',
    'coup': 'coup.html',
    'avalon': 'avalon.html'
};

for (const key of Object.keys(paths)) {
    const file = paths[key];
    const path = rootDir + '/client/' + file;
    if (fs.existsSync(path)) {
        console.log('Routing /' + key + ' => ' + path);
        app.get('/' + key, (_req, res) => {
            res.sendFile(path);
        });
    }
}

//
// Set up socket.io connections
//

import { SocketTransport } from './server/socket.transport';

io.sockets.on('connection', (socket) => {

    const _transport = new SocketTransport(socket);

});

server.listen(app.get('port'), () => {
    console.log('multiplayr server listening on port ' + app.get('port'));
});
