const fs = require('fs');
const mongoose = require('mongoose');
const datefns = require('date-fns');
const eslocale = require('date-fns/locale/es');
const mailer = require('nodemailer');
const pdfmake = require('pdfmake');

mongoose.connect('mongodb://localhost/evaldo',{useNewUrlParser: true});
var connection = mongoose.connection;

connection.on('error', ()=>{
	console.log('Error conectando a la base de datos');
	console.log('Saliendo.');
	process.exit();
	});

var schema = mongoose.Schema;

var documentosCoordinador;
var transport;

try{
		let archivo = fs.readFileSync('./config.json', {encoding: 'utf8'});
		if(archivo.charCodeAt(0) == 65279)
			archivo = archivo.slice(1);
		config = JSON.parse(archivo)
		adminData = config.admin;
		evaluaciones = config.evaluaciones;
		if(typeof(adminData.correo) != 'string' || adminData.correo == '' || typeof(adminData.passCorreo) != 'string' || adminData.passCorreo == '')
			throw(new Error('Mala configuracion de los datos de administrador'))
		else{
			transport = mailer.createTransport({
				service: 'gmail',
				auth:{
					user: adminData.correo,
					pass: adminData.passCorreo
				}
			})
			transport.correo = adminData.correo;
			transport.password = adminData.passCorreo;
		}
		if( !(evaluaciones instanceof Array) || evaluaciones.length <= 0)
		{
			throw(new Error('Mala configuracion de las evaluaciones'))
		}
		else
			documentosCoordinador = evaluaciones;
}
catch(error){
		console.log('Hubo un problema con respecto al archivo de configuracion. Revise el manual de usuario. A continuacion tiene una pista');
		console.log(error);
		console.log('Saliendo.');
		process.exit();
}

var esquemaProfesor = new schema({
    nombre: {type: String, uppercase: true, required: true, trim: true},
	apellido: {type: String, uppercase: true, required: true, trim: true},
	cedula: {type: String, required: true, trim: true},
	correo: {type: String, trim: true, lowercase: true},
	carrera: {type: Array},
	documentosSecretaria: {type: Array, default: []},
	documentosCoordinador: {type: Array, default: documentosCoordinador},
	validado: {type: Boolean, default: false},
	periodoAcademico: {type: String, default: '', uppercase: true}
})
var esquemaCuentas = new schema({
	usuario: {type: String, lowercase: true, required: true, trim: true},
	clave: {type: String, required: true},
	tipo : {type: String, lowercase: true, required: true, trim: true},
	nombre: {type: String, required: true, trim: true},
	correo: {type: String, lowercase: true, required: true, trim: true},
	id : {type: Number},
	activo : {type: Boolean},
	carrera : {type: String},
	newPassKey: {type: String, trim: true, default: ""}
});

var cuentas = mongoose.model('cuentas', esquemaCuentas);
var profesores = mongoose.model('profesores', esquemaProfesor);
async function getType(req){
	return cuentas.findOne({id: req.cookies.id}, (error, resultado) => {
		if(error)
			console.log(error);
		}).then((value) => {
			if(value === null)
				return 'none';
			else
			{
				if(value.tipo == "coordinador de carrera")
					return ({tipo : value.tipo, carrera: value.carrera});
				else
					return ({tipo: value.tipo});
			}
		});
};
async function getDocuments(tipo, entregado, cedulaProfesor, addName, carreraTipo){
	parametros = {};
	if(tipo == 'des. docente' && cedulaProfesor && cedulaProfesor != 'none')
	{
		parametros.cedula = cedulaProfesor;
	}
	else if(cedulaProfesor){
		parametros.cedula = cedulaProfesor;
	}
	switch(tipo)
	{
		case 'des. docente':{
			return profesores.find(parametros)
			.then((profesoresGroup)=>{
				let documentosRespuesta = [];
				profesoresGroup.forEach(profesor => {
					profesor.documentosSecretaria.forEach((documento)=>{
						
						if(profesor.cedula === 'none'){	
							if(cedulaProfesor === 'none')
							{
								documentosRespuesta.push(documento);
								return;
							}
							return;
						}
						
							if(addName)
								documento.nombre = `Profesor ${profesor.nombre} ${profesor.apellido} - ${documento.nombre}`;
							if(typeof(entregado) != 'undefined'){
									if(entregado == false)
									{	
										if(!documento.entregado)
											documentosRespuesta.push(documento);
									}
									else
									{
										documentosRespuesta.push(documento);
									}
							}
							else{
								documentosRespuesta.push(documento);
							}
					})
				});
				return documentosRespuesta;
			})
			.catch((error)=>{
				console.log(error);
				});
		}
		break;

		case 'coordinador de carrera': {
			return profesores.find(parametros)
			.then( (profesoresGroup)=>{
				let documentosRespuesta = [];
				if(cedulaProfesor != 'none')
				{
					profesoresGroup = profesoresGroup.filter((profesor)=>{
					let carreraFlag = false;
					if(!profesor.validado)
						return false
					profesor.carrera.forEach((carrera)=>{
						if(carrera == carreraTipo)
							carreraFlag = true;
					});
						return carreraFlag;
					});
				}
				profesoresGroup.forEach((profesor)=>{
					profesor.documentosCoordinador.forEach((documento)=>{
							let objetoAux = {};
							if(profesor.cedula === 'none')
							{
								objetoAux.fechaI = documento.fechaEntregaI;
								objetoAux.fechaF = documento.fechaEntregaF;
								objetoAux.nombre = documento.nombre;
								documentosRespuesta.push(objetoAux);
								return;
							}

							if(entregado != undefined)
							{
								if(entregado){
									if(!documento.estado)
										return;
								}
								else{
									if(documento.estado)
										return;
								}
							}
							objetoAux.nombre = ''
							if(addName != undefined)
							{
								if(addName)
									objetoAux.nombre = `${profesor.nombre} ${profesor.apellido} - `;
							}
							objetoAux.nombre = `${objetoAux.nombre}${documento.nombre}`
							objetoAux.nota = documento.nota;
							objetoAux.fechaRaw = documento.fechaEntregaF;
							documento.fechaEntregaF ? objetoAux.fechaEntregaF = datefns.format(documento.fechaEntregaF, "DD [de] MMMM", {locale: eslocale}) : null;
							documento.fechaEntregaI ? objetoAux.fechaEntregaI = datefns.format(documento.fechaEntregaF, "DD [de] MMMM", {locale: eslocale}) : null;
							objetoAux.estado = documento.estado;
							documentosRespuesta.push(objetoAux);
						})
				})
				return documentosRespuesta;
			})
			.catch( (error) => {console.log(error) } );
		}
		break;

		default:
		break;
	}
}
async function agruparPorFechas(eventos){
	let respuesta = []
	let j = 0;
	eventos.sort((a, b)=>{
		return new Date(a.fechaRaw) - new Date(b.fechaRaw);
	})
	eventos;
	for(let i = 0; i < eventos.length; i++){
		let objetoAux = {}
		objetoAux.fechaRaw = eventos[i].fechaRaw;
		if(i == 0){
			objetoAux.fechaEntregaF = eventos[i].fechaEntregaF;
			objetoAux.eventos = [eventos[i].nombre];
			respuesta.push(objetoAux);
		}
		else{
			if(eventos[i].fechaEntregaF == eventos[i-1].fechaEntregaF){
				respuesta[j].eventos.push(eventos[i].nombre);
			}
			else{
				objetoAux.fechaEntregaF = eventos[i].fechaEntregaF;
				objetoAux.eventos = [eventos[i].nombre];
				respuesta.push(objetoAux);
				j++;
			}
		}
	}
	return respuesta;
}
async function agruparPorFechasDocumentos(eventos){
		return agruparPorFechas(eventos)
		.then((documentosSinProcesar)=>{
			let resultados = [];
			documentosSinProcesar.forEach((objDocumentos)=>{
				let resultado = {};
				resultado.fechaEntregaF = objDocumentos.fechaEntregaF;
				resultado.fechaRaw = objDocumentos.fechaRaw;
				resultado.eventos = {}
				objDocumentos.eventos.forEach((evento)=>{
					let [profesorAct, documentoAct] = evento.split(' - ');
					if(typeof(resultado.eventos[documentoAct]) != 'undefined')
					{
						resultado.eventos[documentoAct].push(profesorAct);
					}
					else{
						resultado.eventos[documentoAct] = [profesorAct];
					}
				})
				resultados.push(resultado);
			})
				return resultados;
			
		})
		.catch((error)=>{});
}


function generarReportePdf(resultado, final){
	let profesor = resultado.profesor;
	let fonts = {
		Serif: {
			normal: './public/fonts/Serif/cmunrm.ttf',
			bold: './public/fonts/Serif/cmunbx.ttf',
			italics: './public/fonts/Serif/cmunti.ttf',
			bolditalics: './public/fonts/Serif/cmunbi.ttf'
		}
	}
	let pdfMaker = new pdfmake(fonts, {
		title: `Planilla ${resultado.profesor.nombre} ${resultado.profesor.apellido}`,
		author: 'Evaldo by Fernando J. Gómez M.'
	});
	let pdf = pdfMaker.createPdfKitDocument({
		content: [
			{//Cabecera
				style: 'cabecera',
				columns:
				[
					{text: `Periodo académico ${resultado.periodoAcademico} \n\n`,
					alignment: 'left',
					},
					{text: `${resultado.fecha}`,
					alignment: 'right',
					}
				]
			}
			,{//Logo
				image:'./public/images/Evaldo.jpg',
				alignment: 'center',
				width: 150,
				margin: [0,0,0,30]	
			},
			{//Datos
				columnGap: 30,
				columns:[
					{
						width: '*',
						fontSize: 15,
						alignment: 'left',
						text:[
					{
						text:'Nombre: ', bold: true
					},
					`${profesor.nombre}\n`,
					{
						text:'Apellido: ', bold: true
					},
						`${profesor.apellido}\n`,
					{
						text:'Cedula: ', bold: true
					},
						`${profesor.cedula}\n`,
					{
						text:'Carreras: ', bold: true
					},
						(
							()=>{
								if(resultado.carreras.length == 1)
									return resultado.carreras[0];

								carreras = '';
								for(let i = 0; i < resultado.carreras.length; i++)
								{
									carreras += `\n${resultado.carreras[i]}`;
								}
								return carreras;
							}
						)(),
					,]
					},
					{//Nota
						fontSize: 15,
						width: 'auto',
						alignment: 'right',
						text:[
							{text: 'Nota absoluta: ', bold: true},
							`${resultado.notaAbsoluta}\n`,
							{text:'Nota relativa: ', bold: true},
							`${resultado.notaRelativa}\n`,
							{text:'% evaluado: ', bold: true},
							`${resultado.porcentajeEvaluado*100}%\n`
						]
					}
				]
			},{//Nota
				margin: [0,25,0,0],
				style:{
						color: (()=>{
									if(!final)
										return 'red'
									else
										return 'black'
								})(),
						alignment: 'center'},
				text: (()=>{
								if(final)
									return 'Planilla de evaluación final'
								else
									return 'Nota: Planilla de evaluación a la fecha'
					})()
			},
			{//Evaluaciones
				margin: [0,50,0,0],
				table: {
					body: [
							[{text:'Evaluación', style:{bold:true, fontSize:14}}, {text:'Evaluado', style:{bold:true, fontSize:14}},{text:'Valor', style:{bold:true, fontSize:14}}, {text:'Resultado', style:{bold:true, fontSize:14}}, {text:'Total', style:{bold:true, fontSize:14}}]
							]
						.concat( (()=>
										{
										let array = [];
										resultado.notas.forEach((evaluacion)=>{
									with (evaluacion){
										if(evaluado)
											evaluado = {text:'SI', style:{alignment:'center'}}
										else
											evaluado = {text:'NO', style:{alignment:'center'}}

										array.push([nombre, evaluado, {text:`${porcentaje}`, style:{alignment:'center'}}, {text:`${puntos}`, style:{alignment:'center'}}, {text:`${nota}`, style:{alignment:'center'}}])
									}
										});
									return array;})()
								)
				}
			}
		],
		style:{
			cabecera: {
				fontSize: 14,
				bold: true
			}
		},
		defaultStyle:{
			font: 'Serif'
		}
	});
	return pdf;
}


function resultadosProfesor(req){
	let cedula = req.body.cedula;
	return profesores.findOne({cedula: cedula})
	.then((profesor)=>{
		if(!profesor)
		{
			return {encontrado: false};
		}
		else{
			if(req.tipo == 'coordinador de carrera')
			{
				let carreraFlag = false;
				profesor.carrera.forEach((carrera)=>{
					if(carrera == req.carrera)
						carreraFlag = true;
				})
				if(!carreraFlag) 
				{
					return {encontrado:false}
				}
			}
		}

		if(!profesor.validado)
			return {encontrado: false};
			
		documentos = profesor.documentosCoordinador;
		let porcentajeEvaluado = 0;
		let notas = [];
		let notaAbsoluta = 0;
		let notaRelativa = 0;
		let i = 0;
		documentos.forEach((documento)=>{

			if(!documento.estado)
			{
				documento.nota = 0;
				documento.notaCalculada = 0; 
			}
			else{
				documento.notaCalculada = documento.nota * documento.porcentaje;
				porcentajeEvaluado += documento.porcentaje;
			}
			notaAbsoluta += documento.notaCalculada;
			notaRelativa += documento.notaCalculada;
			documento.porcentaje = documento.porcentaje *100;
			notas.push({
				nombre: documento.nombre, 
				evaluado: documento.estado, 
				puntos: documento.nota, 
				nota: documento.notaCalculada,  
				porcentaje: `${documento.porcentaje}%`});
			notas;
		})
		if(porcentajeEvaluado != 0)
			notaRelativa/=porcentajeEvaluado;
		
		notaRelativa = Math.floor(notaRelativa);
		notaAbsoluta = Math.floor(notaAbsoluta);
		return {
			encontrado: true,
			profesor: {nombre: profesor.nombre, apellido: profesor.apellido, cedula: profesor.cedula},
			notaAbsoluta: notaAbsoluta,
			notaRelativa: notaRelativa,
			notas: notas,
			porcentajeEvaluado: porcentajeEvaluado,
			carreras: profesor.carrera,
			fecha: req.fecha,
			periodoAcademico: profesor.periodoAcademico
		};

	})
	.catch((error)=>{return undefined})
}
var logs = ()=>{
	let mensajes = [];
	let temporizador;
	function getData(){
		setData()
		return fs.readFileSync('./logs', {encoding: 'utf8'});
	};
	function setData(){
		let file = fs.openSync('./logs','a');
		mensajes.forEach( (mensaje) => {
			fs.writeSync(file,`${mensaje}\r\n`)
		});
		fs.closeSync(file)
		mensajes = [];
		clearTimeout(temporizador);
		temporizador = setTimeout(setData, 60 * 60 * 1000);
	}
	function newMessage(mensaje){
		if(typeof(mensaje) == 'string' && mensaje != '')
		{
			mensajes.push(mensaje);
		}
		if(mensajes.length >= 10)
		{
			setData();
		}
	}
	temporizador = setTimeout(setData, 60 * 60 * 1000);
	return {
		get: getData,
		newMessage: newMessage,
	}
};

var busy = ()=>{
	let busy;
		return {estado: busy,
				toggle: ()=>{busy = !busy}}
}
module.exports.mongoose = mongoose;
module.exports.connection = connection;
module.exports.profesor = profesores;
module.exports.cuenta = cuentas;
module.exports.getType = getType;
module.exports.getDocuments = getDocuments;
module.exports.agruparPorFechas = agruparPorFechas;
module.exports.agruparPorFechasDocumentos = agruparPorFechasDocumentos;
module.exports.logs = logs();
module.exports.mailer = transport;
module.exports.resultadosProfesor = resultadosProfesor;
module.exports.generarReportePdf = generarReportePdf;
module.exports.busy = busy();