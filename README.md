# updatebot

-Bot para telegram que permite actualizar aplicaciones en php y nodejs

--Seguridad:

la única forma de enviar comandos es agregar los id de usuarios de telegram

--Configuración

cambiar el nombre de app.js_EXAMPLE a app.js y completar con los datos requeridos

en caso de usar pm2 para vigilar cambios, agregar lo siguiente:

 "watch": true,
    "ignore_watch": ["nedbFile", "/nedbFile", "./nedbFile"]
