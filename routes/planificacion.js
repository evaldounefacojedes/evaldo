const express = require('express');
const router = express.Router();
const profesorModel = require('../modules/mongodb').profesor;
const busy = require('../modules/mongodb').busy;
const resultadoProfesor = require('../modules/mongodb').resultadosProfesor;
const generarPDF = require('../modules/mongodb').generarReportePdf;
const fs = require('fs');
const archiver = require('archiver');
const mailer = require('../modules/mongodb').mailer;

router.get('/', (req, res, next) => {
	if(req.tipo == 'planificacion'){
		profesorModel.find({})
			.then((profesoresArray) => {
				//Filtrando lor profesores de las carreras
				profesoresArray = profesoresArray.filter((profesor)=>{
					if(profesor.cedula == 'none' || !profesor.validado)
						return false;
					else
						return true;
				});

				//número de profesores
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
					profesoresEvaluados.porcentaje = 0
					profesoresParcialmenteEvaluados.porcentaje = 0
					profesoresNoEvaluados.porcentaje = 0
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

				res.render('./planificacion/index', {resultados: resultados, fecha: req.fecha});
				})
			.catch(()=>{});
	}
	else{
		next();
	}
});
router.post('/listadoDeProfesores', (req, res, next) => {
	profesorModel.find({})
	.then((profesores)=>{
		let profesoresArray = [];
		profesores.forEach((profesor)=>{
			if(profesor.cedula == 'none')
				return;
			profesoresArray.push({
				nombre: profesor.nombre,
				apellido: profesor.apellido,
				cedula: profesor.cedula,
				carrera: profesor.carrera
			});
		});
		res.send(JSON.stringify({profesores : profesoresArray}));
	})
	.catch((error)=>{})
});
router.post('/nuevoPeriodo', (req, res, next)=>{
	if(req.tipo != 'planificacion')
		next();
	else{
			if(!busy.estado && !req.cookies.nuevoPeriodo){
				busy.toggle();
				res.cookie('nuevoPeriodo', true);
				profesorModel.find({validado: true, $where: 'return this.cedula != "none"'})
				.then((resultadoBusqueda)=>{
					if(!resultadoBusqueda || resultadoBusqueda.length == 0){
						busy.toggle();
						res.clearCookie('nuevoPeriodo');
						res.send(JSON.stringify({estado: true, mensaje:'Nuevo periodo establecido'}))
						return
					}
					if(!fs.existsSync(`./archivo/${resultadoBusqueda[0].periodoAcademico}`))
					{
						fs.mkdirSync(`./archivo/${resultadoBusqueda[0].periodoAcademico}`,{recursive: true});
					}
					res.send(JSON.stringify({estado: true, trabajando: true}));
					resultadoBusqueda.forEach((profesor, index, array)=>{
						resultadoProfesor({body:{
							cedula: profesor.cedula
						},
						tipo: req.tipo,
						fecha: req.fecha
						}).then((resultadoEvalProfesor)=>{
							let pdf = generarPDF(resultadoEvalProfesor, true);
							pdf.pipe(fs.createWriteStream(`./archivo/${profesor.periodoAcademico}/${profesor.nombre}_${profesor.apellido}_${profesor.cedula}.pdf`));
							pdf.end();

							if(array.length-1 == index)
							{
								let archivo = archiver('zip',{
									zlib: {level: 9}
								});
								archivo.pipe(fs.createWriteStream(`./archivo/${profesor.periodoAcademico}.zip`))
								archivo.directory(`./archivo/${profesor.periodoAcademico}`, false)
								archivo.on('end', ()=>{
									mailer.verify((error, success)=>{
										if(error)
											{
												res.send(JSON.stringify({estado: false, mensaje:`Error enviando el correo electrónico. Comprebe la conexion del servidor o la cuenta de correo electronica de evaldo`}));	
												return;
											}
										else{
											mailer.sendMail({
												from: 'Evaldo - Nuevo periodo académico',
												to: mailer.correo,
												subject: `Evaldo - Periodo ${profesor.periodoAcademico}`,
												html: `
													<h2>Se ha establecido un nuevo periodo académico.</h2>
													<br>
													<h3>El respaldo del proceso de evaluación del periodo "${profesor.periodoAcademico}" puede ser encontrado en la carpeta principal de evaldo -> archivo 
													o puede ser descargado desde el presente correo</h3>
													<br>
													<br>
													<h3>Si este correo ha llegado por equivocación, por favor ignórelo.</h2>
													<p style="font-style: italic; margin-left: 5rem; font-size: 1.5rem">~Admin Evaldo</p>
												`,
												attachments: [{
													filename: `Respaldo del periodo ${profesor.periodoAcademico}.zip`,
													path:`./archivo/${profesor.periodoAcademico}.zip`
												}]
											})
										}
									})
								})
								archivo.finalize();
							}
						});
					})

					profesorModel.deleteMany({$where: 'return this.cedula != "none"'})
					.then(()=>{
						profesorModel.updateOne({cedula: 'none'}, {$set:{periodoAcademico: req.body.periodoAcademico}},()=>{});
						busy.toggle();
					}).catch((error)=>{
						console.log(error)
					});
				})
				.catch((error)=>{
					console.log(error);
				})
			}
			else if(busy.estado && req.cookies.nuevoPeriodo)
			{
				res.send(JSON.stringify({estado: true, trabajando: true}));
			}
			else if(!busy.estado && req.cookies.nuevoPeriodo){
				res.send(JSON.stringify({estado: true, mensaje:'Nuevo periodo establecido con éxito'}));
			}
		}
})
module.exports = router;