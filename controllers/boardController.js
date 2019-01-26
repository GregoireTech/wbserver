

exports.onDrawingHandler = (socket, room, data) =>{
    socket.to(socket['room']).emit('drawing', data);
    room.addLine('drawing', data);
    console.log(data);
};

exports.onRectangleHandler = (socket, room, data) =>{
    socket.to(socket['room']).emit('rectangle', data);
    room.addLine('rectangle', data);
    console.log(data);
};

exports.onLinedrawHandler = (socket, room, data) =>{
    socket.to(socket['room']).emit('linedraw', data);
    room.addLine('linedraw', data);
    console.log(data);
};

exports.onCircleDrawHandler = (socket, room, data) =>{
    socket.to(socket['room']).emit('circledraw', data);
    room.addLine('circledraw', data);
    console.log(data);
};

exports.onEllipsedrawHandler = (socket, room, data) =>{
    socket.to(socket['room']).emit('ellipsedraw', data);
    room.addLine('ellipsedraw', data);
    console.log(data);
};

exports.onTextdrawHandler = (socket, room, data) =>{
    socket.to(socket['room']).emit('textdraw', data);
    room.addLine('textdraw', data);
    console.log(data);
};

exports.onCopyCanvasHandler = (socket, room, data) =>{
    socket.to(socket['room']).emit('copyCanvas', data);
    room.addLine('copyCanvas', data);
    console.log(data);
};

exports.onClearboardHandler = (socket, room, data) =>{
    socket.to(socket['room']).emit('Clearboard', data);
    room.clearAll();
};