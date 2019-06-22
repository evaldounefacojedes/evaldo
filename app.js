// ----------------------------- INICIO DE IMPORTACION DE ARCHIVOS ---------------------------------------
const datefns = require('date-fns');
var esLocale = require('date-fns/locale/es')

// Para conocer la IP
const os = require('os');
const fs = require('fs');
var reiniciar;

var logObject = require('./modules/mongodb').logs;
var cuentas = require('./modules/mongodb').cuenta;
const busy = require('./modules/mongodb').busy;
//Librerias Necesarias
const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
var getType = require('./modules/mongodb').getType;

const mailer = require('./modules/mongodb').mailer;
//Date fsn
// ---------------------------- RUTAS ----------------------------
// Login
const login = require('./routes/login');

// Admin
const admin = require('./routes/admin');

// Secretaria
const desDocente = require('./routes/desDocente');

// Coordinador
const coordinador = require('./routes/coordinador');

// Desarrollo docente
const planificacion = require('./routes/planificacion');

//Controlar mongoose
const profesores = require('./modules/mongodb').profesor;
const diasDeDiferencia = require('./modules/fechas').diasDeDiferencia;
const getDocuments = require('./modules/mongodb').getDocuments;
// ----------------------------- FINAL DE IMPORTACION DE ARCHIVOS ---------------------------------------
// ----------------------------- INICIO CONFIGURACION DE EXPRESS ------------------------------------------------

//Creando la aplicacion express
const app = express();
//Configurando Express para usar pug
app.set('view engine', 'pug');
//Acceso estatico a archivos
app.use(express.static(__dirname + '/public'));

//Para usar cookies y peticiones post
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));

// ----------------------------- FINAL CONFIGURACION DE EXPRESS ------------------------------------------------
var config
try{
	let archivo = fs.readFileSync('./config.json', {encoding: 'utf8'});
	if(archivo.charCodeAt(0) == 65279)
		archivo = archivo.slice(1);
	config = JSON.parse(archivo)

	reiniciar = config.reiniciar;
	if(typeof(reiniciar) != 'boolean')
	{
		throw(new Error('Propiedad reiniciar no establecida correctamente'))
	}
	else if(reiniciar)
		{
			profesores.deleteMany({},()=>{
				console.log('Profesores eliminados correctamente');
				cuentas.deleteMany({},()=>{
					console.log('Cuentas eliminadas correctamente')
					console.log('Cambie la propiedad "reinicio" en el archivo de configuracion y reinicie.');
					console.log('Saliendo.');
					process.exit();
				});
			});
		}
}
catch(error){
	console.log('Error procesando el archivo de configuracion. Detalles: ');
	console.log(error);
	console.log('Saliendo.');
	process.exit();
}
// ----------------------------- INICIO DE LAS RUTAS  ------------------------------------------------/



app.use('/', login);

app.use('*', (req, res, next) => {
	req.fecha = datefns.format(new Date().toLocaleString(),"DD [de] MMMM [del] YYYY - hh:mm a", {locale: esLocale});
	getType(req).then((caracteristicas)=>{
		req.tipo = caracteristicas.tipo;
		if(req.tipo == "coordinador de carrera")
			req.carrera = caracteristicas.carrera;
		next();
	});
});
app.post('/setPeriodo', (req, res, next) => {
	if(req.tipo != 'planificacion')
		next();
	else{
		profesores.updateMany({},{$set:{periodoAcademico:req.body.periodo}},(error, resultado)=>{
			if(error)
				res.send(JSON.stringify({estado: false, mensaje:'Error al actualizar documentos'}));
			else	
			{
				res.send(JSON.stringify({estado: true, mensaje:'Nombre del periodo establecido con éxito'}));
			}
		})		
	}
});

app.use('*', (req, res, next)=>{
	if(busy.estado && !req.cookies.nuevoPeriodo){
		res.send('Servidor ocupado')
		return;
	}
	else if(req.cookies.nuevoPeriodo){
		next();
		return;
	}

	profesores.findOne({cedula: 'none'})
	.then((base)=>{
		if( typeof(base.periodoAcademico) != 'string' || base.periodoAcademico == '' ){
			if( req.tipo != 'admin' && req.tipo != 'planificacion'){
					res.render('noPeriodo');
			}
			else{
					if(req.tipo == 'admin')
						next();
					else
						res.render('setPeriodo');
			}
		}
		else
			next();
	})
	.catch((error) => console.log(error));
});

app.use('/', (req, res, next)=>{

	var estado = {
		numeroDeProfesores : 0,
		documentosPendientes: 0,
		documentosAlertas: 0,
		documentosEntregados: 0
	};
	switch(req.tipo)
	{
		case 'des. docente' : {
			estado.noValidados = 0;		
			profesores.find().
			then((resultado)=>{
				estado.numeroDeProfesores = resultado.length - 1;
				resultado.forEach((profesor)=>{
					if(profesor.cedula === 'none'){
						return;
					}

					if(profesor.documentosSecretaria == null)
					{
						estado.noValidados++;
						return;
					}
					let flagValidado = true;
					profesor.documentosSecretaria.forEach((documento) => {
						if(documento.entregado)
							estado.documentosEntregados++
						else
						{
							flagValidado = false;
							estado.documentosPendientes++;
						}
						
					})
					if(!flagValidado || !profesor.validado)
						estado.noValidados++;
				});
				req.estado = estado;
				next();
				return;
		})
		.catch((error)=> console.log(error));
			}
		break;

		case 'coordinador de carrera':{
			profesores.find().then((profesoresResultado)=>{
				profesoresResultado = profesoresResultado.filter((profesor)=>{
					let carreraFlag = false;
					if(profesor.cedula == 'none' || !profesor.validado)
						return false;
					profesor.carrera.forEach((carrera)=>{
						if(carrera == req.carrera)
							carreraFlag = true;
					});
					return carreraFlag;
				});
				estado.numeroDeProfesores = profesoresResultado.length;
				getDocuments(req.tipo,undefined, undefined, undefined, req.carrera).then((documentos)=>{

					if(documentos == undefined)
					{
						req.estado = estado;
						next();
						return;
					}
					documentos.forEach((documento)=>{
						if(documento.estado)
							estado.documentosEntregados++;
						else if(documento.fechaRaw){
							if(diasDeDiferencia(documento.fechaRaw) < 0)
								estado.documentosAlertas++;
							else if(diasDeDiferencia(documento.fechaRaw) > 0)
								estado.documentosPendientes++;
						}
					})
					req.estado = estado;
					next();
				})
				.catch((error)=> console.log(error));
			})
			.catch((error)=> console.log(error));
		}
		break;

		default:
			next();
		break;
	}
});

app.use('/', admin);

app.use('/', coordinador);

app.use('/', desDocente);

app.use('/', planificacion);

// ----------------------------- FIN DE LAS RUTAS  ------------------------------------------------/

app.get('/logs', (req, res, next)=>{
	res.render('logs', {logs: logObject.get(), fecha: req.fecha});
});
//Error 404.
app.use((req, res) => {
	res.status(404).send('Error 404. Not Found!');
});


//Crear servidor en el puerto 80
app.listen(80, () => {
	if(reiniciar)
		return;
	let adminData;
	try{
		busy.estado = false;
		adminData = config.admin;
		if(typeof(adminData.usuario) != 'string' || adminData.usuario == '' || typeof(adminData.pass) != 'string' || adminData.pass == ''
		|| typeof(adminData.correo) != 'string' || adminData.correo == '' || typeof(adminData.passCorreo) != 'string' || adminData.passCorreo == '')
			throw(new Error('Mala configuracion del adminData'))
	}
	catch{
		console.log('Hubo un problema con respecto al archivo de configuracion. Revise el manual de usuario.');
		console.log('Saliendo.');
		process.exit();
	}

	if(!fs.existsSync(`./archivo`))
	{
		fs.mkdirSync(`./archivo`,{recursive: true});
	}
		

	fs.appendFile("./logs",'',(error, file)=>{
		if(error)
			console.log(error);
		else
			logObject.newMessage('[Sistema] Archivo de registro verificado');
	})

	cuentas.findOne({tipo: 'admin'})
	.then((cuenta)=>{
		if(cuenta == null)
		{
			let admin = new cuentas({usuario: adminData.usuario, clave: adminData.pass, tipo:'admin', nombre: 'Administrador', correo: adminData.correo});
			admin.save();
			logObject.newMessage('[Sistema] Administrador reiniciado');
		}		
	})
	.catch((error)=>{});

	profesores.findOne({cedula: 'none'})
	.then((resultado) =>{
		if(resultado == null)
		{
			let none = new profesores({cedula:'none', nombre: 'none', apellido: 'none'});
			none.save();
			logObject.newMessage('[Sistema] Plantilla base para profesores reiniciada');
		}
	})
	.catch((error)=>{
		console.log(error);
	})

	mailer.verify((error, sucess)=>{
		if(error){
			console.log('Error en la configuracion del correo. A continuacion el log completo:');
			console.log(error);
			console.log('Evaldo no podra enviar correos');
			}
		else
			console.log('Preparado para enviar correos');
	})

    for (let aux in os.networkInterfaces()) {
        for (let aux2 in os.networkInterfaces()[aux]) {
            let interfaz = os.networkInterfaces()[aux][aux2];
            if (!interfaz.internal && interfaz.family == "IPv4") {
                console.log(`Servidor Creado en ${interfaz.address}`);
				logObject.newMessage(`Servidor Creado en la ip:${interfaz.address}`);
            }
        }
    }
});