const TelegramBot = require( 'node-telegram-bot-api' );
var spawn = require( 'child_process' ).spawn;
var fs = require( 'fs' ); 
var util = require( 'util' );
var log_file = fs.createWriteStream( /*__dirname +*/ '/var/log/diachenko.log', {flags : 'w'} );
var log_stdout = process.stdout;
const https = require( 'https' );
var axios = require( 'axios' );

var config = require( './apps.js' );

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

        if( typeof(authorized.find( item => item = from_id )) !== 'undefined' ){

                if( /^pull/i.test(from_txt) ){

                        bot.sendMessage(chat_id, "Seleccione aplicación para actualizar",
                        {
                                reply_markup: {
                                        inline_keyboard: keyboard
                                }
                        });
                }
        }else{
                return;
        }
});

bot.on('callback_query', function onCallbackQuery( callbackQuery ) {

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

function send2log( logtext ){

        log_file.write( logtext + '\n' );
}

function updatePhp( appIndex ){

        let pull = spawn( "git", ["-C", apps[appIndex].ruta ,"pull","https://"+ gitlabUser + ":" + gitlabPass + "@" + apps[appIndex].url] );

        pull.stdout.on("data", data => {

                console.log(`stdout: ${data}`);
                send2log(`stdout: ${data} `);

                bot.sendMessage(chat_id, `${data}`);
        });

        pull.on('error', (error) => {

                console.log(`stderr: ${error}`);
                send2log(`stderr: ${error} `);

                bot.sendMessage(chat_id,`${error}`);
        });

        pull.on("close", code => {

                console.log(`child process exited with code ${code}`);
                send2log(`child process exited with code ${code} `);

                bot.sendMessage(chat_id,`child process exited with code ${code}`);
        });
}

function updateNpm(appIndex){

        let pull = spawn("git", ["-C", app[appIndex].ruta, "pull", "https://"+ gitlabUser +":"+ gitlabPass + "@" + apps[appIndex].url]);

        pull.stdout.on("data", data => {

                console.log(`stdout: ${data}`);
                send2log(`stdout: ${data} `);
                
                bot.sendMessage(chat_id, `${data}`);

        });

        pull.on('error', (error) => {

                console.log(`stderr: ${error}`);
                send2log(`stderr: ${error} `);
                bot.sendMessage(chat_id,`${error}`);+

                bot.sendMessage("se canceló la actualización");

                return;
        });

        pull.on("close", code => {

                console.log(`child process exited with code ${code}`);
                send2log(`child process exited with code ${code} `);
                bot.sendMessage(chat_id,`child process exited with code ${code}`);


                bot.sendMessage(chat_id, "npm install enviado");
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

                });

                npmi.on("close", code => {

                        console.log(`child process exited with code ${code}`);
                        log_file.write(`child process exited with code ${code} \n`);
                        bot.sendMessage(chat_id,`child process exited with code ${code}`);

                        bot.sendMessage(chat_id, "npm run build enviado");

                	log_file.write('[!] build APP Salud \n');

        	        let npmbuild = spawn("npm", ['run','build', '--prefix', rutaAppSalud]);

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
	                });
                });

        });

}
