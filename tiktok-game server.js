const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { WebcastPushConnection } = require('tiktok-live-connector');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

let tiktokLiveConnection = null;

io.on('connection', (socket) => {
    console.log('صفحة اللعبة متصلة بالخادم');

    socket.on('connect-tiktok', (uniqueId) => {
        if (tiktokLiveConnection) {
            tiktokLiveConnection.disconnect();
        }

        tiktokLiveConnection = new WebcastPushConnection(uniqueId);

        socket.emit('tiktok-status', { status: 'connecting', message: 'جاري الاتصال بالبث...' });

        tiktokLiveConnection.connect().then(state => {
            socket.emit('tiktok-status', { status: 'connected', message: `تم الاتصال ببث: ${uniqueId}` });
        }).catch(err => {
            socket.emit('tiktok-status', { status: 'disconnected', message: 'فشل الاتصال بالبث! تأكد أنك لايف حالياً.' });
        });

        // الاستماع للتعليقات
        tiktokLiveConnection.on('chat', data => {
            socket.emit('tiktok-chat', {
                uniqueId: data.uniqueId,
                nickname: data.nickname,
                comment: data.comment
            });
        });

        // الاستماع لمغادرة المتابعين
        tiktokLiveConnection.on('streamEnd', () => {
            socket.emit('tiktok-status', { status: 'disconnected', message: 'انتهى البث المباشر' });
        });
    });

    socket.on('disconnect-tiktok', () => {
        if (tiktokLiveConnection) {
            tiktokLiveConnection.disconnect();
            tiktokLiveConnection = null;
        }
        socket.emit('tiktok-status', { status: 'disconnected', message: 'تم قطع الاتصال' });
    });
});

server.listen(3000, () => {
    console.log('الخادم يعمل على المنفذ http://localhost:3000');
});
