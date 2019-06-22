const express = require('express');
const router = express.Router();

var profesoresModel = require('../modules/mongodb').profesor;
const getDocuments = require('../modules/mongodb').getDocuments;
const agruparPorFechasMongo = require('../modules/mongodb').agruparPorFechas;
const agrupar = require('../modules/mongodb').agruparPorFechasDocumentos;
const diasDeDiferenciaNew = require('../modules/fechas').diasDeDiferencia;
const datefns = require('date-fns');
const logObject = require('../modules/mongodb').logs;

function agruparPorFechas(eventos){
	let respuesta = []
	let j = 0;
	for(let i = 0; i < eventos.length; i++){
		let objetoAux = {}
		if(i == 0){
			objetoAux.fecha = eventos[i].fechaString;
			objetoAux.eventos = [eventos[i].mensaje];
			respuesta.push(objetoAux);
		}

		else{
			if(eventos[i].fechaString == eventos[i-1].fechaString){
				respuesta[j].eventos.push(eventos[i].mensaje);
			}
			else{
				objetoAux.fecha = eventos[i].fechaString;
				objetoAux.eventos = [eventos[i].mensaje];
				respuesta.push(objetoAux);
				j++;
			}
		}
	}
	return respuesta;
}

router.get('/', (req, res, next) => {
	
	if(req.tipo == 'des. docente'){

		res.render('./desDocente/index', {fecha: req.fecha, estado: req.estado});
	}
	else{
		next();
	}
});

router.get('/personal', (req, res, next) => {
	if(req.tipo == 'des. docente'){
		profesoresModel.find(function (err, result){
			let profesoresArray = [];
			profesor = {};
			result.forEach((element) => {
				if(element.cedula == 'none')
				{
					return;
				}
				var profesor = element;
				profesor.estado = 'Completo';
				if(profesor.documentosSecretaria.length == 0)
				{
					profesor.estado = 'Sin Registro'
				}
				profesor.documentosSecretaria.forEach((documento)=>{
					if(!documento.entregado)
						profesor.estado = 'Incompleto'
				})
				element.documentosSecretaria.forEach( (documento) =>{
					diasDeDiferencia = datefns.getDayOfYear(documento.fecha) - datefns.getDayOfYear(new Date());
					if(!documento.entregado && diasDeDiferencia < 0)
					{
						profesor.estado = 'ALERTA';
					}
				});
				profesoresArray.push(profesor)
			});
			res.render('./desDocente/personal', {profesores: profesoresArray, fecha: req.fecha});	
		});
	}
	else{
		next();
	}
});

router.post('/informacionProfesor', (req, res, next) =>{
	if(req.tipo == 'des. docente'){
		getDocuments(req.tipo, undefined, req.body.cedula, undefined)
		.then((documentos)=>{
			documentos.sort((a,b)=>{
				if(b.fecha == '')
				{	
					return true;
				}
				return new Date(a.fecha) - new Date(b.fecha);
			})
			respuesta = {nombre: req.body.nombre, recaudos: documentos}
			res.cookie('cedula', req.body.cedula, {httpOnly: true});
			res.send(JSON.stringify(respuesta));
		})
		.catch((error)=> console.log(error));
	}
	else{
		next();
	}
});

router.post('/actualizarProfesor', (req, res, next) => {
	if(req.tipo == 'des. docente')	{

		if(req.cookies.cedula == 'none')
		{
			let documentosLocales = req.body.recaudos;
			profesoresModel.find()
			.then((profesores)=>{
				profesores.forEach((profesor)=>{
					let documentosServer = profesor.documentosSecretaria
					
					if(profesor.cedula == 'none')
					{
						profesoresModel.updateOne({cedula: 'none'}, {documentosSecretaria:documentosLocales}, (error, resultado)=> {});
						logObject.newMessage(`[Des. Docente] - Plantilla de documentos modificada`);
					}
					else{
						//Añadir los nuevos recaudos
						documentosLocales.forEach((documentoLocal)=>{
							let index = documentosServer.findIndex((documentoServer)=>{
								return documentoServer.nombre == documentoLocal;
							})
							if(index == -1){
								documentosServer.push({nombre: documentoLocal, entregado: false});
							}
						});

						//Eliminar los viejos
						documentosServer.forEach((documentoServer)=>{
							let index = documentosLocales.findIndex((documentoLocal) => {
								return documentoLocal === documentoServer.nombre
							})
							if(index == -1)
							{
								documentoServer.nombre = '';
							}
						});

						documentosServer = documentosServer.filter((documentoServer)=>{
							return documentoServer.nombre != '';
						})

						let validado = true;
						documentosServer.forEach((documento)=>{
							if(!documento.entregado)
								validado = false;
						});
						
						if(documentosServer.length == 0)
						{
							validado = false;
						}

						profesoresModel.updateOne({cedula: profesor.cedula}, {documentosSecretaria:documentosServer, validado: validado}, (error, resultado)=> {}); 
					}
				});
			})
			.catch((error)=>{
				console.log(error);
			})
			res.clearCookie('cedula');
			res.send({mensaje: 'hecho'});
		}
		else
		{
			profesoresModel.findOne({cedula: req.cookies.cedula}, ()=>{})
			.then((resultado)=>{
				let validado = true
				let estadoAnterior = resultado.validado;

				req.body.recaudos.forEach((documento)=>{
					if(!documento.entregado)
						validado = false;
				})

				//Si el estado cambio
				if(estadoAnterior != validado)
				{
					//Si antes no estaba registrado ahora si
					if(!estadoAnterior)
						logObject.newMessage(`[Des. Docente] - Ha validado al profesor ${resultado.nombre} ${resultado.apellido}`);
					else
						logObject.newMessage(`[Des. Docente] - Ha invalidado al profesor ${resultado.nombre} ${resultado.apellido}`);
				}
				else{
						logObject.newMessage(`[Des. Docente] - Ha modificado los recaudos pendientes del profesor ${resultado.nombre} ${resultado.apellido}`)
				}
				profesoresModel.updateOne({cedula: resultado.cedula}, {documentosSecretaria: req.body.recaudos, validado: validado},(error, resultado)=>{
				})
				.then((value)=> {})
				.catch((error)=>
				console.log(error))

				res.clearCookie('cedula');
				res.send({mensaje: 'hecho'});
			})
			.catch((error) => {
				console.log(error);
			});
		}
		
	}
	else{
			next();
	}
});

router.post('/eventos', (req,res,next)=>
{
	if(req.tipo == 'des. docente'){
		res.cookie('cedula', 'none', {httpOnly: true});
		let entregado = req.body.entregado;
		getDocuments(req.tipo, entregado, req.body.cedula, true)
			.then((eventos) =>{
					if(entregado == undefined)
					{
						res.send(JSON.stringify({documentos: eventos}));
						return;
					}
					respuesta = {};
					eventos.map((evento)=>{
						let [profesor, documento] = evento.nombre.split(' - ')
						if(!respuesta[documento])
							respuesta[documento] = [profesor]
						else
							respuesta[documento].push(profesor);
					});
					respuesta;
					res.send(JSON.stringify({documentos: respuesta}));
			})
			.catch((error)=>{console.log(error)});
		}
	else{
		next();
	}
});

module.exports = router;