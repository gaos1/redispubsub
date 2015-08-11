'use strict';
var redis = require('redis');
var vcap_services = JSON.parse(process.env.VCAP_SERVICES)
var sub = redis.createClient(vcap_services.redis[0].credentials.port, vcap_services.redis[0].credentials.host, {host: vcap_services.redis[0].credentials.host, port: vcap_services.redis[0].credentials.port, password: vcap_services.redis[0].credentials.password});
sub.auth(vcap_services.redis[0].credentials.password)
var pub = redis.createClient(vcap_services.redis[0].credentials.port, vcap_services.redis[0].credentials.host, {host: vcap_services.redis[0].credentials.host, port: vcap_services.redis[0].credentials.port, password: vcap_services.redis[0].credentials.password});
pub.auth(vcap_services.redis[0].credentials.password)
sub.subscribe('chat');

module.exports = function(io) {
    io.on('connection', function(err, socket, session) {
        if (!session.user) return;

        /*
         When the user sends a chat message, publish it to everyone (including myself) using
         Redis' 'pub' client we created earlier.
         Notice that we are getting user's name from session.
         */
        socket.on('chat', function(data) {
            var msg = JSON.parse(data);
            var reply = JSON.stringify({
                action: 'message',
                user: session.user,
                msg: msg.msg
            });
            pub.publish('chat', reply);
        });

        /*
         When a user joins the channel, publish it to everyone (including myself) using
         Redis' 'pub' client we created earlier.
         Notice that we are getting user's name from session.
         */
        socket.on('join', function() {
            var reply = JSON.stringify({
                action: 'control',
                user: session.user,
                msg: ' joined the channel'
            });
            pub.publish('chat', reply);
        });

        /*
         Use Redis' 'sub' (subscriber) client to listen to any message from Redis to server.
         When a message arrives, send it back to browser using socket.io
         */
        sub.on('message', function(channel, message) {
            socket.emit(channel, message);
        });
    })
}
