// módulos
const TelegramBot = require( 'node-telegram-bot-api' );
var spawn = require( 'child_process' ).spawn;
var axios = require( 'axios' );
var Datastore = require('nedb')
  , db = new Datastore({ filename: __dirname + '/nedbFile', autoload: true });

//configuraciones
var config = require( './apps.js' );
const token = config.token;
const bot = new TelegramBot(token, {polling: true});
const apps = config.apps;
const gitlabUser = config.gitlabUser;
const gitlabPass = config.gitlabPass;
const authorized = config.authorized;

// teclado en chat
let keyboard = [];

for( let i = 0 ; i < apps.length ; i++ ){

        if(apps[i].activo)
                keyboard.push( [{ "text": apps[i].nombre , "callback_data": i }] );
}

// datos del mensaje
let from_name;
let from_id;
let from_txt;
let chat_id;

//eventos
bot.on('message', (msg) => {


        // console.log(msg)

        from_name = msg.from.first_name;
        from_id = msg.from.id;
        from_txt = msg.text;
        chat_id = msg.chat.id;
        msg_id = msg.message_id

        if( typeof(authorized.find( item => item = from_id )) !== 'undefined' ){

                // mensajes para el dashboard "\t texto"
                if( /^\/t/i.test(from_txt) ){

                        send2Dash(from_txt.substring(2));
                }

                // actualización de aplicaciones
                if( /^pull/i.test(from_txt) ){

                        bot.sendMessage(chat_id, "Seleccione aplicación para actualizar",
                        {
                                reply_markup: {
                                        inline_keyboard: keyboard
                                }
                        });
                }

                // autoactualización
                if( /^autoupdateplease/i.test(from_txt) ){

                        // autoupdate();
                }

                // traer logs
                if( /^logsplease/i.test(from_txt) ){

                        getLogs();
                }

                // activar webmin
                if( /^web/i.test(from_txt) ){

                        webminon();
                }

                // desactivar webmin
                if( /^wqq/i.test(from_txt) ){

                        webminoff();
                }

                // test
                if( /^qqqq/i.test(from_txt) ){

                        let d = from_txt.split( ' ' );

                        if( d.length > 1){

                                let date1 = from_txt.split( ' ' )[1];

                                date1 = date1.split('-');
        
                                date2 = new Date(date1[1] + "-" + date1[0] + "-" + date1[2]).toISOString();

                        }else{

                                date2 = new Date( Date.now() ).toISOString().split('T')[0]
                        }

                        

                        temp(date2);
                }

                // expediente dani

                if(  /^exp/i.test(from_txt) ){


                        expediente("800","002686","2021");

                }

                if(  /^com/i.test(from_txt) ){


                        comision();

                }
        }else{
                return;
        }
});

bot.on('callback_query', function onCallbackQuery( callbackQuery ) {

        bot.editMessageText("<!> Órden recibida. procesando...", {"chat_id": callbackQuery.message.chat.id, "message_id": callbackQuery.message.message_id});

        update( callbackQuery.data );

});

function update( appIndex ){

        switch(apps[appIndex].update){

                case 'php':
                        updatePhp( appIndex );
                break;

                case 'npm':
                        updateNpm( appIndex );
                break;
        }
}

// actualización de aplicación en php sin build
function updatePhp( appIndex ){

        bot.sendMessage(chat_id,"<!> Actualizo " + apps[appIndex].nombre + " con el método para php");
        send2DB("update", "PHP method update in " + apps[appIndex].nombre);
        send2Dash( from_name + " está actualizando " + apps[appIndex].nombre);

        let pull = spawn( "git", ["-C", apps[appIndex].ruta ,"pull","https://"+ gitlabUser + ":" + gitlabPass + "@" + apps[appIndex].url] );

        pull.stdout.on("data", data => {

                console.log(`stdout: ${data}`);
                bot.sendMessage(chat_id, `${data}`);
        });

        pull.on('error', (error) => {

                console.log(`stderr: ${error}`);
                bot.sendMessage(chat_id,"[X] se canceló la actualización ->" + `${error}`);
        });

        pull.on("close", code => {

                console.log(`child process exited with code ${code}`);
                bot.sendMessage(chat_id,`child process exited with code ${code}`);
                bot.sendMessage(chat_id, "<!> finalizado");
        });
}

// actualización de aplicación en node con build
function updateNpm(appIndex){

        bot.sendMessage(chat_id,"<!> Actualizo " + apps[appIndex].nombre + " con el método para node");
        send2DB("update", "NPM method (with build) update in " + apps[appIndex].nombre);
        send2Dash( from_name + " está actualizando " + apps[appIndex].nombre);

        let pull = spawn("git", ["-C", apps[appIndex].ruta, "pull", "https://"+ gitlabUser +":"+ gitlabPass + "@" + apps[appIndex].url] );

        pull.stdout.on("data", data => {

                console.log(`stdout: ${data}`);
                bot.sendMessage(chat_id, `${data}`);
        });

        pull.on('error', (error) => {

                console.log(`stderr: ${error}`);
                bot.sendMessage(chat_id,`${error}`);
                bot.sendMessage(chat_id,"[X] se canceló la actualización ->" + `${error}`);
        });

        pull.on("close", code => {

                console.log(`child process exited with code ${code}`);
                bot.sendMessage(chat_id,`child process exited with code ${code}`);

                bot.sendMessage(chat_id, "<!> npm install enviado");

                let npmi = spawn( "npm", ['i', '--prefix', apps[appIndex].ruta] );

                npmi.stdout.on("data", data => {

                        console.log(`stdout: ${data}`);
                        log_file.write(`stdout: ${data} \n`);
                        bot.sendMessage(chat_id, `${data}`);

                });

                npmi.on('error', (error) => {

                        console.log(`stderr: ${error}`);
                        bot.sendMessage(chat_id,`${error}`);
                        bot.sendMessage(chat_id, "<!> finalizado");
                });

                npmi.on("close", code => {

                        console.log(`child process exited with code ${code}`);
                        bot.sendMessage(chat_id,`child process exited with code ${code}`);

                        bot.sendMessage(chat_id, "<!> npm run build enviado");

        	        let npmbuild = spawn("npm", ['run','build', '--prefix', apps[appIndex].ruta]);

	                npmbuild.stdout.on("data", data => {

                	        console.log(`stdout: ${data}`);
	                        bot.sendMessage(chat_id, `${data}`);
                	});

        	        npmbuild.on('error', (error) => {

	                        console.log(`stderr: ${error}`);
                	        bot.sendMessage(chat_id,`${error}`);
        	        });

	                npmbuild.on("close", code => {

                        	console.log(`child process exited with code ${code}`);
        	                bot.sendMessage(chat_id,`child process exited with code ${code}`);

                                bot.sendMessage(chat_id, "<!> finalizado");
	                });
                });
        });
}

function send2Dash( message ){

        send2DB("dashboard",message);

        var axiosconfig = {

                method: 'post',
                url: config.apiurl,
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': config.apitoken,
                },
                data : {"message": message}
        };

        axios(axiosconfig)
        .then(function (response) {

                bot.sendMessage(chat_id, "<!> mensaje enviado a dashboard");
        })
        .catch(function (error) {

          console.log("[X] ERROR en envío al dashboard ----> ", error);
        });
}

function autoupdate(){

        send2DB("autoupdate", "autoupdate");

        bot.sendMessage(chat_id,"<!> Autoactualizándome! ");

        const fileOptions = {
                filename: 'RoboCop_dismemberd.jpg',
                contentType: 'image/jpeg',
              };

        bot.sendPhoto(chat_id, 'RoboCop_dismemberd.jpg');

        let pull = spawn( "git", ["pull"] );

        pull.stdout.on("data", data => {

                console.log(`stdout: ${data}`);
                bot.sendMessage(chat_id, `${data}`);
        });

        pull.on('error', (error) => {

                console.log(`stderr: ${error}`);
                bot.sendMessage(chat_id,"[X] se canceló la actualización ->" + `${error}`);
        });

        pull.on("close", code => {

                console.log(`child process exited with code ${code}`);
                bot.sendMessage(chat_id,`child process exited with code ${code}`);

                bot.sendMessage( chat_id, "<!> finalizado");
        });
}

function send2DB(tipo, mensaje){

        let timestamp = Date.now();
        
        let doc = 
        {
                "id": chat_id,
                "timestamp": timestamp,
                "tipo": tipo,
                "nombre": from_name,
                "mensaje": mensaje

        };

        db.insert(doc, function(err,newDoc){
                
                if(err) console.log("[X] Error al escribir la base de datos");
        });
}

//envía el archivo con la base de datos, legible como txt
function getLogs(){

        bot.sendDocument(chat_id, __dirname + "/nedbFile");

}

function temp(date){

        bot.sendMessage(chat_id, date)

        // console.log(config.apitoken)


        var axiosconfig = {

                method: 'get',
                url: config.tempurl,
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': config.apitoken,
                }
        };

        axios(axiosconfig)
                .then(function (response) {

                        // console.log(response)
                        let responseString = "";
                        
                        for (const property in response.data) {

                                responseString += `${property}: ${response.data[property]}` + "\n";
                                //console.log(`${property}: ${object[property]}`);
                        }

                        // bot.sendMessage(chat_id, JSON.stringify(response.data));
                        bot.sendMessage(chat_id, responseString);
                })
                .catch(function (error) {

                        console.log("[X] ERROR", error);
                });
                
}


function expediente (prefijo, numero, año){

        var axiosconfig = {

                method: 'get',
                url: "https://mosp.sanjuan.gob.ar/ol/?or=2B331CC34D344C31875DED5E05060FAA&Prefijo=" + prefijo + "&Numero=" + numero + "&Anio=" + año + "&Tipo=EXP&Movimientos=1",
                headers: {
                  'Content-Type': 'application/json'
                }
        };

        axios(axiosconfig)
                .then(function (response) {

                        // console.log(response)
                        let responseString = "";
                        
                        for (const property in response.data) {


                                responseString += `${property}: ${response.data[property]}` + "\n";
                                
                        }

                        bot.sendMessage(chat_id, JSON.stringify(response.data));
                        //bot.sendMessage(chat_id, response.data.res);
                })
                .catch(function (error) {

                        console.log("[X] ERROR", error);
                });


}

function comision (){

        // damian
        
        var axiosconfig = {

                method: 'get',
                url: "https://mosp.sanjuan.gob.ar/ol/?or=2B331CC34D344C31875DED5E05060FAA&Prefijo=703&Numero=34&Anio=2021&Tipo=EXP&Movimientos=1",
                headers: {
                  'Content-Type': 'application/json'
                }
        };

        axios(axiosconfig)
                .then(function (response) {

                        // console.log(response)
                        let responseString = "";
                        
                        for (const property in response.data) {


                                responseString += `${property}: ${response.data[property]}` + "\n";
                                
                        }

                        bot.sendMessage(chat_id, "Damián\n" + JSON.stringify(response.data.res));
                        //bot.sendMessage(chat_id, response.data.res);
                })
                .catch(function (error) {

                        console.log("[X] ERROR", error);
                });


                // ivan
        
                var axiosconfig = {

                        method: 'get',
                        url: "https://mosp.sanjuan.gob.ar/ol/?or=2B331CC34D344C31875DED5E05060FAA&Prefijo=703&Numero=35&Anio=2021&Tipo=EXP&Movimientos=1",
                        headers: {
                          'Content-Type': 'application/json'
                        }
                };
        
                axios(axiosconfig)
                        .then(function (response) {
        
                                // console.log(response)
                                let responseString = "";
                                
                                for (const property in response.data) {
        
        
                                        responseString += `${property}: ${response.data[property]}` + "\n";
                                        
                                }
        
                                bot.sendMessage(chat_id, "Iván\n" + JSON.stringify(response.data.res));
                                //bot.sendMessage(chat_id, response.data.res);
                        })
                        .catch(function (error) {
        
                                console.log("[X] ERROR", error);
                        });

                // seba
        
                var axiosconfig = {

                        method: 'get',
                        url: "https://mosp.sanjuan.gob.ar/ol/?or=2B331CC34D344C31875DED5E05060FAA&Prefijo=703&Numero=36&Anio=2021&Tipo=EXP&Movimientos=1",
                        headers: {
                        'Content-Type': 'application/json'
                        }
                };

                axios(axiosconfig)
                        .then(function (response) {

                                // console.log(response)
                                let responseString = "";
                                
                                for (const property in response.data) {


                                        responseString += `${property}: ${response.data[property]}` + "\n";
                                        
                                }

                                bot.sendMessage(chat_id, "Seba\n" + JSON.stringify(response.data.res));
                                //bot.sendMessage(chat_id, response.data.res);
                        })
                        .catch(function (error) {

                                console.log("[X] ERROR", error);
                        });


}

function webminon(){

        bot.sendMessage(chat_id, "<!> saco");

        let dissite = spawn( "a2dissite", ['approdrigo'] );

        dissite.on("close", code => {

                bot.sendMessage(chat_id, "<!> sacado");

                bot.sendMessage(chat_id, "<!> poniendo");

                let ensite = spawn("a2ensite", ['webmin']);

                ensite.on("close", code => {

                        bot.sendMessage(chat_id, "<!> reiniciando");

                        let restart = spawn("service", ['apache2','restart']);
        
                        restart.on("close", code => {

        
                                bot.sendMessage(chat_id, "<!> listo https://estudioiver.sanjuan.gob.ar/ ");
                        });
                });
        });

}

function webminoff(){

        bot.sendMessage(chat_id, "<!> saco");

        let dissite = spawn( "a2dissite", ['webmin'] );

        dissite.on("close", code => {

                bot.sendMessage(chat_id, "<!> sacado");

                bot.sendMessage(chat_id, "<!> volviendo");

                let ensite = spawn("a2ensite", ['approdrigo']);

                ensite.on("close", code => {

                        bot.sendMessage(chat_id, "<!> reiniciando");

                        let restart = spawn("service", ['apache2','restart']);
        
                        restart.on("close", code => {

        
                                bot.sendMessage(chat_id, "<!> como trompada");
                        });
                });
        });

}