const fs = require('fs');
const path = require('path');
serversString = ''

const getServers = (counter) => {
    // Node Get ICE STUN and TURN list
    var https = require("https");
    var options = {
        host: "global.xirsys.net",
        path: "/_turn/MassonWB",
        method: "PUT",
        headers: {
            "Authorization": "Basic " + new Buffer("gregoireTech:a4ed76e0-2254-11e9-a913-0242ac110003").toString("base64")
        }
    };
    var httpreq = https.request(options, function (httpres) {
        var str = "";
        httpres.on("data", function (data) {
            str += data;
            serversString += data;
            //console.log(serverList);
        });
        httpres.on("error", function (e) {
            console.log("error: ", e);
        });
        httpres.on("end", function () {
            console.log("ICE List: ", str);
            writeServersToFile();
        });
    });
    httpreq.end();
    
    
}

const writeServersToFile = () => {
    fs.writeFileSync(path.join(__dirname + '/../config/iceServers.json'), serversString);
}


exports.getServers = getServers;