var app = require('express')();
var serveStatic = require('serve-static');
var http = require('http').Server(app);
var io = require('socket.io')(http);
var basepath = __dirname + "/media/";
var path;
var bs = require("bit-sync");

app.use(serveStatic('static'))
var filedata
io.on('connection', function(socket){

    //服务器接收到文件传输请求
    //根据 filename 找到文件并且计算 checksum 传输到客户端
    socket.on('commit', function(filename){

        console.log(filename);
        path = basepath + filename;
        getFileData(path,
            function(data)
            {
                //data = new Uint8Array([0,1]);

                dataView = new Uint8Array(data);
                console.log("server origin file length:",dataView.byteLength);
                dataViewBuffer = dataView.buffer.slice(0);

                filedata = dataView.buffer.slice(0);

                //console.log("======= data =======")
                //console.log(dataViewBuffer);

                var blockSize = 160;
                var doc = new Uint8Array(bs.createChecksumDocument(blockSize, dataViewBuffer));
                //console.log("======= doc =======")
                //console.log(doc);
                console.log("server send doc length:",doc.byteLength);
                io.emit('doc',doc);
                //clone = data.buffer.slice(0);
                //var patchDocument = bs.createPatchDocument(doc, clone);
                //var patchedFile = bs.applyPatch(patchDocument, data);
                //console.log(verifyData(patchedFile,clone));
            });
    });

    //服务器端接收到 patchDoc ，使用applyPatch函数应用于现文件
    socket.on('patchDoc', function(patchDocument){

        patchDocView = new Uint8Array(patchDocument);
        console.log("patche doc length:",patchDocView.byteLength);
        patchDocViewBuffer = patchDocView.buffer.slice(0);
        patchedFile = new Uint8Array(bs.applyPatch(patchDocViewBuffer, filedata));
        console.log("server after file length:",patchedFile.byteLength);
        //console.log("========= patched file ======");
        //console.log(patchedFile);
        var fs = require("fs");
        fs.open(path, 'w', function(err, fd) {
            if (err) {
                throw 'error opening file: ' + err;
            } else {
                fs.write(fd, patchedFile, 0, patchedFile.length, function(err) {
                    if (err){
                        throw 'error writing file: ' + err;
                    }
                    else{
                        //console.log('file written');
                        fs.close(fd, function() {
                            console.log('file written success');
                            io.emit('result','success');
                        });}
                });
            }
        });
        /*
         console.log("========= file data ======");
         console.log(new Uint8Array(filedata));
         console.log(verifyData(patchedFile,filedata));
         */
    });
});

//运行起网页服务器和socket io服务器
http.listen(3001,function(){
    console.log('listening on http://localhost:6000');
});



// 在服务器端读取文件
function getFileData(file, callback)
{
    var fs = require("fs");
    fs.readFile(file,
        function(err, data)
        {
            if(err)
                console.log("Error getting file data: " + err);
            callback(data);
        });

}
// 判断两个buffer是否一样
function verifyData(buffer1, buffer2)
{
    var buffer1View8 = new Uint8Array(buffer1);
    var buffer2View8 = new Uint8Array(buffer2);

    if(buffer1.byteLength != buffer2.byteLength) return false;

    var pass = true;
    for(var i=0; i<buffer1View8.length; i++)
        if(buffer1View8[i] != buffer2View8[i])
        {
            pass=false;
            break;
        }
    return pass;
}