const TelegramBot = require( 'node-telegram-bot-api' );
var spawn = require( 'child_process' ).spawn;
var axios = require( 'axios' );

var config = require( './apps.js' );

var fs = require( 'fs' ); 
var util = require( 'util' );
var log_file = fs.createWriteStream( /*__dirname +*/ '/var/log/updateBOT.log', {flags : 'w'} );
var log_stdout = process.stdout;

const token = config.token;

const apps = config.apps;

const gitlabUser = config.gitlabUser;
const gitlabPass = config.gitlabPass;

const authorized = config.authorized;

const bot = new TelegramBot(token, {polling: true});

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

bot.on('message', (msg) => {

        from_name = msg.from.first_name;
        from_id = msg.from.id;
        from_txt = msg.text;
        chat_id = msg.chat.id;
        msg_id = msg.message_id

        if( typeof(authorized.find( item => item = from_id )) !== 'undefined' ){

                if( /^t/i.test(from_txt) ){

                        send2Dash(from_txt.substring(1));
                }

                if( /^pull/i.test(from_txt) ){

                        bot.sendMessage(chat_id, "Seleccione aplicación para actualizar",
                        {
                                reply_markup: {
                                        inline_keyboard: keyboard
                                }
                        });
                }

                if( /^autoupdate/i.test(from_txt) ){

                        autoupdate();
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

// logfile

function send2log( logtext ){

        log_file.write( "[" + Date.now() + "] - " + logtext + '\n' );
}

function updatePhp( appIndex ){

        bot.sendMessage(chat_id,"<!> Actualizo " + apps[appIndex].nombre + " con el método para php");
        send2log( from_name + " -> UPDATE -> " + apps[appIndex].nombre);
        send2Dash( from_name + " está actualizando " + apps[appIndex].Nombre);

        let pull = spawn( "git", ["-C", apps[appIndex].ruta ,"pull","https://"+ gitlabUser + ":" + gitlabPass + "@" + apps[appIndex].url] );

        pull.stdout.on("data", data => {

                console.log(`stdout: ${data}`);
                send2log(`stdout: ${data} `);

                bot.sendMessage(chat_id, `${data}`);
        });

        pull.on('error', (error) => {

                console.log(`stderr: ${error}`);
                send2log(`stderr: ${error} `);

                bot.sendMessage(chat_id,"[X] se canceló la actualización ->" + `${error}`);
        });

        pull.on("close", code => {

                console.log(`child process exited with code ${code}`);
                send2log(`child process exited with code ${code} `);

                bot.sendMessage(chat_id,`child process exited with code ${code}`);

                bot.sendMessage(chat_id, "<!> finalizado");
        });
}

function updateNpm(appIndex){

        bot.sendMessage(chat_id,"<!> Actualizo " + apps[appIndex].nombre + " con el método para node");
        send2log( from_name + " -> UPDATE -> " + apps[appIndex].nombre);
        send2Dash( from_name + " está actualizando " + apps[appIndex].Nombre);

        let pull = spawn("git", ["-C", apps[appIndex].ruta, "pull", "https://"+ gitlabUser +":"+ gitlabPass + "@" + apps[appIndex].url] );

        pull.stdout.on("data", data => {

                console.log(`stdout: ${data}`);
                send2log(`stdout: ${data} `);
                
                bot.sendMessage(chat_id, `${data}`);
        });

        pull.on('error', (error) => {

                console.log(`stderr: ${error}`);
                send2log(`stderr: ${error} `);
                bot.sendMessage(chat_id,`${error}`);

                bot.sendMessage(chat_id,"[X] se canceló la actualización ->" + `${error}`);

                return;
        });

        pull.on("close", code => {

                console.log(`child process exited with code ${code}`);
                send2log(`child process exited with code ${code} `);
                bot.sendMessage(chat_id,`child process exited with code ${code}`);


                bot.sendMessage(chat_id, "<!> npm install enviado");
                send2log('npm i -> ' + apps[appIndex].nombre);

                let npmi = spawn( "npm", ['i', '--prefix', apps[appIndex].ruta] );

                npmi.stdout.on("data", data => {

                        console.log(`stdout: ${data}`);
                        log_file.write(`stdout: ${data} \n`);

                        bot.sendMessage(chat_id, `${data}`);

                });

                npmi.on('error', (error) => {

                        console.log(`stderr: ${error}`);
                        log_file.write(`stderr: ${error} \n`);
                        bot.sendMessage(chat_id,`${error}`);

                        bot.sendMessage(chat_id, "<!> finalizado");
                });

                npmi.on("close", code => {

                        console.log(`child process exited with code ${code}`);
                        log_file.write(`child process exited with code ${code} \n`);
                        bot.sendMessage(chat_id,`child process exited with code ${code}`);

                        bot.sendMessage(chat_id, "<!> npm run build enviado");

                	log_file.write('build -> \n' + apps[appIndex].nombre);

        	        let npmbuild = spawn("npm", ['run','build', '--prefix', apps[appIndex].ruta]);

	                npmbuild.stdout.on("data", data => {

                	        console.log(`stdout: ${data}`);
        	                log_file.write(`stdout: ${data} \n`);

	                        bot.sendMessage(chat_id, `${data}`);
                	});

        	        npmbuild.on('error', (error) => {

	                        console.log(`stderr: ${error}`);
                        	log_file.write(`stderr: ${error} \n`);
                	        bot.sendMessage(chat_id,`${error}`);
        	        });

	                npmbuild.on("close", code => {

                        	console.log(`child process exited with code ${code}`);
                	        log_file.write(`child process exited with code ${code} \n`);

        	                bot.sendMessage(chat_id,`child process exited with code ${code}`);

                                bot.sendMessage(chat_id, "<!> finalizado");
	                });
                });
        });
}

function send2Dash( message ){

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
          // console.log("<!> RESPONSE -->",JSON.stringify(response.data));
        })
        .catch(function (error) {

          console.log("[X] ERROR en envío al dashboard ----> ", error);
        });
}

function autoupdate(){

        console.log("DIRNAME_>_>_>_>"+__dirname);

        bot.sendMessage(chat_id,"<!> Autoactualizándome! ");
        bot.sendPhoto(chat_id, __dirname + "RoboCop_dismemberd.jpg");
        
        send2log( Date.now() + " - " + from_name + " -> AUTOUPDATE");

        let pull = spawn( "git", ["pull"] );

        pull.stdout.on("data", data => {

                console.log(`stdout: ${data}`);
                send2log(`stdout: ${data} `);

                bot.sendMessage(chat_id, `${data}`);
        });

        pull.on('error', (error) => {

                console.log(`stderr: ${error}`);
                send2log(`stderr: ${error} `);

                bot.sendMessage(chat_id,"[X] se canceló la actualización ->" + `${error}`);
        });

        pull.on("close", code => {

                console.log(`child process exited with code ${code}`);
                send2log(`child process exited with code ${code} `);

                bot.sendMessage(chat_id,`child process exited with code ${code}`);

                bot.sendMessage( chat_id, "<!> finalizado");
        });

}