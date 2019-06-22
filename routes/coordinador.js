const express = require('express');
const router = express.Router();

var logObject = require('../modules/mongodb').logs;

const profesorModel = require('../modules/mongodb').profesor;
const getDocuments = require('../modules/mongodb').getDocuments;
const agruparPorFechas = require('../modules/mongodb').agruparPorFechas;
const agruparPorFechasDocumentos = require('../modules/mongodb').agruparPorFechasDocumentos;
const diasDeDiferencia = require('../modules/fechas').diasDeDiferencia;
const datefns = require('date-fns');
const esLocale = require('date-fns/locale/es')
const resultadoProfesor = require('../modules/mongodb').resultadosProfesor;
const generarReportePdf = require('../modules/mongodb').generarReportePdf;
const fs = require('fs');

router.get('/', (req, res, next) => {
	if(req.tipo == 'coordinador de carrera'){
		res.render('./coordinador/index', {fecha: req.fecha, estado: req.estado});
	}
	else{
		next()
	}
});
router.get('/personal', (req, res, next) => {
	
	if(req.tipo == 'coordinador de carrera'){
		profesorModel.find({carrera: req.carrera}, ()=>{})
		.then((value)=>{
				if(value)
				{
					let profesoresArray = [];
					value.forEach((element) => {
						element.estado = true;
						element.alerta = false;
						element.documentosCoordinador.forEach((documento)=>{
							if(!documento.estado)
							{
								element.estado = false;
									if(diasDeDiferencia(documento.fechaEntregaF) <= 0)
									{
										element.alerta = true;
									}
							}
						})
						profesoresArray.push(element);
						});
					res.render('./coordinador/personal', {profesores: profesoresArray, fecha: req.fecha});
				}
				else
					res.redirect('/personal');
			}).catch((error) => console.log(error));
	}
	else{
		next();
	}
});

router.get('/resultados', (req, res, next) => {
	switch(req.tipo)
	{
		case 'coordinador de carrera' :
		{
			profesorModel.find({})
			.then((profesoresArray) => {
				//Filtrando lor profesores de las carreras
				profesoresArray = profesoresArray.filter((profesor)=>{
					if(profesor.cedula == 'none' || !profesor.validado)
						return false;
					
					if(req.tipo == 'coordinador de carrera')
					{
						let carreraCorrecta = false;
						profesor.carrera.forEach((carrera)=>{
							if(carrera == req.carrera)
								carreraCorrecta = true;
						})
						return carreraCorrecta;
					}
					else
						return true;
				});

				//Numero de profesores
				let numeroDeProfesores = profesoresArray.length;

				//Profesores evaluados
				let profesoresEvaluados = {numero: 0, porcentaje: 0};
				let profesoresParcialmenteEvaluados = {numero: 0, porcentaje:0};
				let profesoresNoEvaluados = {numero: 0, porcentaje: 0};

				let evaluacion = {};
				//Calculando que profesores han sido evaluados, parcialmente o no
				profesoresArray.forEach((profesor)=>{
					let evaluacionesRealizadas = 0;
					profesor.documentosCoordinador.forEach((documento)=>{
						if(!evaluacion[documento.nombre])
						{
							evaluacion[documento.nombre] = {realizadas:0, noRealizadas: 0, puntosAcumulados: 0, nombre: documento.nombre}
						}

						if(documento.estado){
							evaluacion[documento.nombre].realizadas++;
							evaluacion[documento.nombre].puntosAcumulados+= documento.nota;
							evaluacionesRealizadas++
						}
						else{
							evaluacion[documento.nombre].noRealizadas++;
						}
					});
					if(evaluacionesRealizadas == profesor.documentosCoordinador.length)
						profesoresEvaluados.numero++;
					else{
						if(evaluacionesRealizadas > 0)
							profesoresParcialmenteEvaluados.numero++;
						else
							profesoresNoEvaluados.numero++;
					}
				});

				//Porcentaje de cada tipo de profesor
				if(numeroDeProfesores != 0){
					profesoresEvaluados.porcentaje = Math.ceil( (profesoresEvaluados.numero/numeroDeProfesores) * 100);
					profesoresParcialmenteEvaluados.porcentaje = Math.ceil( (profesoresParcialmenteEvaluados.numero/numeroDeProfesores) * 100);
					profesoresNoEvaluados.porcentaje = 100 - profesoresEvaluados.porcentaje - profesoresParcialmenteEvaluados.porcentaje;
				}
				else{
					profesoresEvaluados.porcentaje = 0;
					profesoresParcialmenteEvaluados.porcentaje = 0;
					profesoresNoEvaluados.porcentaje = 0;
				}
				

				
				for(val in evaluacion){
					evaluacion[val].promedio = Math.ceil( evaluacion[val].puntosAcumulados / evaluacion[val].realizadas );
					if(Number.isNaN(evaluacion[val].promedio))
						evaluacion[val].promedio = 0;
				}

				let resultados = 
				{
					numeroDeProfesores : numeroDeProfesores,
					profesoresEvaluados : profesoresEvaluados, 
					profesoresParcialmenteEvaluados : profesoresParcialmenteEvaluados,
					profesoresNoEvaluados : profesoresNoEvaluados,
					evaluacion : evaluacion
				}
				res.render('./coordinador/resultados', {fecha: req.fecha, resultados: resultados});
				})
			.catch(()=>{});
		}
			break;
		default:
	}
});

router.post('/resultadoProfesor', (req, res, next)=>
{
	resultadoProfesor(req)
	.then( (resultado) =>{
		if(!resultado)
		{
			res.send(JSON.stringify({encontrado: false, mensaje: 'Se ha producido un error buscando.'}));
			res.end();
			return;
		}
		if(!resultado.encontrado)
		{
			res.send(JSON.stringify({encontrado: false, mensaje: 'La cedula suminstrada no corresponde a ningun profesor registrado y validado.'}));
			res.end();
			return;
		}
		else{
			if(req.body.pdfFile){
				pdf = generarReportePdf(resultado, false);
				pdf.pipe(fs.createWriteStream('./archivo/tmp.pdf'));
				pdf.end();
				resultado.profesor.cedula = resultado.profesor.cedula.replace(/\./gi,'');
				res.cookie('pdfName', `${resultado.profesor.nombre}_${resultado.profesor.apellido}_${resultado.profesor.cedula}.pdf`)
				res.send(JSON.stringify({encontrado: true, pdf:true}));
			}
			else{
				res.send(JSON.stringify(resultado));
				res.end();
				return;
			}
		}
	});
});
router.get('/resultadoProfesor', (req, res, next)=>{
	if(req.cookies.pdfName != undefined)
	{
		let pdfName = req.cookies.pdfName;
		res.download('./archivo/tmp.pdf', pdfName);
		return;
	}
	else
		next();
})
router.post('/eventos', (req, res, next)=>{
	req.body;
	if(req.tipo == 'coordinador de carrera')
	{
		let eventosPendientes =  [];
		let advertencias = [];
		getDocuments(req.tipo, false, undefined, true, req.carrera).then((documentosNoEntregados)=>{
			documentosNoEntregados = documentosNoEntregados.filter((value)=>{
				return value.fechaEntregaF;
			})
			agruparPorFechasDocumentos(documentosNoEntregados)
			.then((documentosAgrupados)=>{
				documentosAgrupados.forEach((documento)=>{
					dias = diasDeDiferencia(documento.fechaRaw);
					if(dias >= 0 && dias < 30)
						eventosPendientes.push(documento);
					else if( dias < 0)
						advertencias.push(documento);
				});
				
				res.send(JSON.stringify({estado: true, advertencias: advertencias, eventosPendientes: eventosPendientes}));	
			})
			.catch(()=>{});
		}).catch((error)=>console.log(error));
	}
	else
		next()
})
router.post('/informacionProfesor', (req, res, next)=>{

	if(req.tipo == 'coordinador de carrera'){
		getDocuments(req.tipo, undefined, req.body.cedula, undefined, req.carrera)
			.then((documentos)=>{
				documentos.sort((a,b)=>{
					if(b.fecha == '')
					{	
						return true;
					}
					return new Date(a.fecha) - new Date(b.fecha);
				})
				
				if(req.body.iniciados)
				{
					documentos = documentos.filter((documento)=>{
						return diasDeDiferencia(documento.fechaI) <= 0;
					})

					documentos = documentos.map((documento)=>{
						documento.fechaI = datefns.format(documento.fechaI ,"DD [de] MMMM", {locale: esLocale});
						return documento;
					})

				}

				respuesta = {nombre: req.body.nombre, recaudos: documentos}
				res.cookie('cedula', req.body.cedula, {httpOnly: true});
				res.send(JSON.stringify(respuesta));
			})
			.catch((error)=> console.log(error));
		}
	else
		next();
})
router.post('/actualizarProfesor', (req, res, next)=>{
	if(req.tipo == 'coordinador de carrera'){
		if(req.cookies.cedula){
			profesorModel.findOne({cedula: req.cookies.cedula})
			.then((profesor)=>{
				if(profesor)
				{
					profesor.documentosCoordinador = profesor.documentosCoordinador.map((documentoServer) => {
						index = req.body.documentos.findIndex((documentoLocal)=>{
							return documentoLocal.nombre === documentoServer.nombre
						})

						if(index != -1)
						{
							let documentoLocal = req.body.documentos[index];
							documentoServer.estado = documentoLocal.estado;
							documentoServer.nota = documentoLocal.nota;
							return documentoServer
						}
						else
							return null;
					});

					profesorModel.updateOne({cedula: profesor.cedula},{documentosCoordinador:profesor.documentosCoordinador}, ()=>{
						logObject.newMessage(`[Coordinador] [${req.carrera}] - Ha actualizado la informacion sobre ${profesor.nombre} ${profesor.apellido}`);
						res.send(JSON.stringify({estado: true, mensaje: `Datos guardados`}))
					});
					
				}
				else
					res.send(JSON.stringify({estado: false, mensaje: `Profesor no encontrado`}))
			})
			.catch((error)=> console.log(error))
		}
	}
	else
	{
		next();
	}
});
router.post('/database/registrarProfesor', (req, res, next) => {
	if(req.tipo == 'coordinador de carrera'){
		profesorModel.findOne({cedula: req.body.cedula}, ()=>{})
		.then((resultado)=>{
			if(resultado == null){
				let nuevoProfesor = new profesorModel({nombre: req.body.nombre,
											apellido: req.body.apellido,
											cedula: req.body.cedula,
											carrera: req.carrera});
				profesorModel.findOne({cedula: 'none'})
				.then((modelo)=>{
					nuevoProfesor.documentosCoordinador = modelo.documentosCoordinador;
					documentosSecretaria = [];
					modelo.documentosSecretaria.forEach((documentoPlantilla)=>{
						documentosSecretaria.push({nombre:documentoPlantilla, entregado: false});
					})
					nuevoProfesor.documentosSecretaria = documentosSecretaria;
					nuevoProfesor.periodoAcademico = modelo.periodoAcademico;
					nuevoProfesor.save(function(error){
					if(error)
						return res.send(JSON.stringify({estado: false, mensaje: error}));
					else
					{
						logObject.newMessage(`[Coordinador] [${req.carrera}] - Ha registrado al profesor ${req.body.nombre} ${req.body.apellido}`);
						return res.end(JSON.stringify({estado: true, mensaje: `Profesor ${req.body.nombre} ${req.body.apellido} registrado con éxito`}));
						}
						
					});
				})
				.catch(error=> console.log(error));
			}
			else{
				if(resultado.carrera.findIndex((element) => element==req.carrera) != -1)
					res.send(JSON.stringify({estado: false, mensaje: "Error: profesor ya registrado"}));
				else{
						resultado.carrera.push(req.carrera)
						profesorModel.updateOne({cedula : resultado.cedula}, {carrera: resultado.carrera})
						.then(()=>{
							logObject.newMessage(`[Coordinador] [${req.carrera}] - Ha añadido a su carrera al profesor ${resultado.nombre} ${resultado.apellido}`);
							res.send(JSON.stringify({estado: true, mensaje: `Profesor ${req.body.nombre} ${req.body.apellido} registrado con éxito`}));
							})
						.catch((error) =>{console.log(error)});
					}
			}
		})
		.catch((error) =>{
			console.log('Error buscando');
		});
	}
	else{
		next();
	}
});
router.post('/database/eliminarProfesor', (req, res, next) => {
	if(req.tipo == 'coordinador de carrera'){
		if(req.body.sure === false){
			profesorModel.findOne({cedula: req.body.cedula}, ()=>{})
			.then((resultado) => {
				if(resultado)
				{
					return res.end(JSON.stringify({found: true, nombre: resultado.nombre, apellido: resultado.apellido, cedula: resultado.cedula}));
				}
				else
					return res.end(JSON.stringify({found: false}));
			})
			.catch((error) => console.log(error));
		}
		else{
				if(req.body.sure === true){
					profesorModel.findOne({cedula: req.body.cedula}).
					then((resultado)=>{
						if(resultado.carrera.length > 1){
							if(resultado.carrera.findIndex((valor)=> valor == req.carrera) != -1)
								{
									resultado.carrera = resultado.carrera.filter( (valor)=> valor != req.carrera)
									profesorModel.updateOne({cedula: resultado.cedula}, {carrera: resultado.carrera})
									.then(()=>{ 
										logObject.newMessage(`[Coordinador] [${req.carrera}] - Se ha eliminado al profesor ${resultado.nombre} ${resultado.apellido} de la carrera ${req.carrera}`)
										res.end( JSON.stringify( {estado: true, mensaje: "Profesor eliminado satisfactoriamente" } ) ) } )
									.catch((error) =>
									{
										console.log(error);})
								}
							else{
								res.end(JSON.stringify({estado: true, mensaje: "Hubo un error eliminando el profesor"}));
							}
						}
						else{
							profesorModel.deleteOne({cedula: req.body.cedula}, ()=> {})
							.then((value) => {
								if(value.ok == 1){	
									res.clearCookie('cedula');
									logObject.newMessage(`[Coordinador] [${req.carrera}] - Ha eliminado completamente al profesor ${resultado.nombre} ${resultado.apellido}`);
									res.end(JSON.stringify({estado: true, mensaje: "Profesor eliminado satisfactoriamente"}));
								}
							})
							.catch((error)=> console.log(error));
						}
					})
					.catch((error) => {console.log(error);});
				}
			}
	}
	else{
		next();
	}
});
router.post('/actualizarFechas', (req, res, next)=>{
	profesorModel.find({}, (error, profesores) =>{
		Array.prototype.forEach.call(profesores, (profesor)=>{
			Array.prototype.forEach.call(profesor.documentosCoordinador, (documentoServer)=>{
				let index = req.body.documentos.findIndex((documentoActual)=>{
					if(documentoActual.nombre === documentoServer.nombre)
						return true;
					else
						return false;
				});

				if(req.body.documentos[index].nombre === documentoServer.nombre)
				{
					documentoServer.fechaEntregaI = req.body.documentos[index].fechaI
					documentoServer.fechaEntregaF = req.body.documentos[index].fechaF
				}
				
			});
			profesorModel.updateOne({cedula: profesor.cedula}, {documentosCoordinador: profesor.documentosCoordinador}, ()=>null);
		});
		logObject.newMessage(`[Coordinador] [${req.carrera}] - Ha modificado las fechas de las evaluaciones`);
		res.send(JSON.stringify({estado: true}));
	})
});
module.exports = router;