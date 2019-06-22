const express = require('express');
const router = express.Router();
const cuentasModel = require('../modules/mongodb').cuenta;
var logObject = require('../modules/mongodb').logs;

router.get('/', (req, res, next) => {
	if(req.tipo == 'admin'){
		cuentasModel.find((error, resultado) =>{})
		.then((value) => {
			res.render('./admin/index', {usuarios : value, fecha: req.fecha});})
		.catch((error) => console.log(error));
	}
	else{
		next();
	}
});

router.post('/database/registrarUsuario', (req, res, next)=>{
	for(val in req.body){
		req.body[val] = req.body[val].toLowerCase()
	}
	if(req.tipo == 'admin'){
		cuentasModel.findOne({$or:[{usuario:req.body.usuario}, {correo:req.body.correo}, {$where: `
	function(){
	if(this.tipo == 'coordinador de carrera') 
		return this.carrera == '${req.body.carrera}'
	else
		return this.tipo == '${req.body.tipo}'
	}
		`}]}, (error, resultado) => {
		if(resultado == null){
			let cuenta = new cuentasModel(req.body);
			cuenta.save((error) => {
				if(error){
						console.log(error);	
						res.send(JSON.stringify({estado: false, mensaje: 'Error guardando el usuario'}));
					}
				else
				{
					logObject.newMessage(`[Admin]  - Ha creado el usuario ${req.body.usuario}`);
					res.send(JSON.stringify({estado: true, mensaje: `Usuario ${req.body.usuario} registrado exitosamente`}));
				}
					
			});
		}
		else{
			if(resultado.usuario == req.body.usuario)
				res.send(JSON.stringify({estado: false, mensaje: "Nombre de usuario en uso"}));
			else if(resultado.correo == req.body.correo)
				res.send(JSON.stringify({estado: false, mensaje: "Correo en uso"}));
			else if(resultado.tipo != 'coordinador de carrera' && resultado.tipo == req.body.tipo)
				res.send(JSON.stringify({estado: false, mensaje: "El usuario del departamento ya se encuentra registrado"}));
			else if(resultado.carrera == req.body.carrera)
				res.send(JSON.stringify({estado: false, mensaje: "El coordinador de la carrera especificada ya se encuentra registrado"}));
		}
		})
	}	
	else{
			res.status(403).send('No tiene los derechos de realizar la siguiente accion');
	}
});

router.post('/database/eliminarUsuario', (req,res, next) => {
	if(req.tipo == 'admin'){
		if(req.body.usuario == 'admin'){
			res.send(JSON.stringify({estado: false, mensaje:'No se puede eliminar al administrador'}));
			}
		else{
			cuentasModel.deleteOne({usuario : req.body.usuario}, ()=>{})
			.then((value)=>{
				if(value.ok == 1){
						logObject.newMessage(`[Admin] - Ha eliminado al usuario ${req.body.usuario}`);
						res.send(JSON.stringify({estado: true, mensaje:'Usuario eliminado'}));
					}
				else{
						res.send(JSON.stringify({estado: false, mensaje:'Algo ha ido mal!'}));
				}})
			.catch((error) => {console.log(error)});
		}
	}
	else
	{
		res.status(403).send('No tiene los derechos de realizar la siguiente accion');
	}
});

module.exports = router;