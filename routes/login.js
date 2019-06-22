const express = require('express');
const router = express.Router();
const mailer = require('../modules/mongodb').mailer;

//Objeto para guardar objetos que contienen las sesiones actuales
idList = {};
var cuentas = require('../modules/mongodb').cuenta;

router.post('/recoveryPassword', (req, res) => {
	if (req.body.codigo) {
		cuentas.findOne({ usuario: req.body.usuario })
			.then((usuario) => {
				if (usuario == null || usuario.newPassKey != req.body.codigo) {
					res.send(JSON.stringify({ estado: false, mensaje: 'Codigo incorrecto' }));
					return;
				}
				else {
					if (req.body.clave.length < 6) {
						res.send(JSON.stringify({ estado: false, mensaje: 'La contraseña no cumple con los requisitos minimos' }));
						return;
					}
					else {
						cuentas.updateOne({ usuario: req.body.usuario }, { clave: req.body.clave, newPassKey: "" }, () => {
							res.send(JSON.stringify({ estado: true, mensaje: 'Contraseña cambiada satisfactoriamente. Ya puede ingresar' }));
							return;
						})
					}
				}
			})
			.catch((error) => console.log(error));
	}
	else {
		cuentas.findOne({ usuario: req.body.usuario })
			.then((usuario) => {
				if (usuario == null) {
					res.send(JSON.stringify({ estado: false, mensaje: `Usuario ${req.body.usuario} no encontrado` }));
					return;
				}
				let newPass = "";
				for (let i = 0; i < 10; i++)
					newPass += Math.floor(Math.random() * 10);
				mailer.verify((error, success) => {
					if (error) {
						res.send(JSON.stringify({ estado: false, mensaje: `Error enviando el correo electrónico. Comprebe la conexion del servidor o la cuenta de correo electronica de evaldo` }));
						return;
					}
					else {
						mailer.sendMail({
							from: 'Login - Evaldo',
							to: usuario.correo,
							subject: 'Evaldo - Cambio de contraseña',
							html: `
							<h2>Ha habido un intento de cambiar la contraseña de acceso a Evaldo para el usuario "${usuario.usuario}"</h2>
							<h2>Si desea proseguir con el cambio de contraseña ingrese el siguiente código en el campo indicando por Evaldo</h2>
							<code style="font-size: 2rem; color: rgb(220,0,0)">Codigo: ${newPass}</code>
							<br>
							<br>
							<h3>Si este código ha llegado por equivocación a su correo, por favor ignórelo.</h2>
							<p style="font-style: italic; margin-left: 5rem; font-size: 1.5rem">~Admin Evaldo</p>
						`
						})
						cuentas.updateOne({ usuario: req.body.usuario }, { newPassKey: newPass }, () => {
							res.send(JSON.stringify({ estado: true, mensaje: `Contraseña enviada al correo ${usuario.correo} \nHaga click en aceptar una vez tenga el código a la mano.` }));
							return;
						});
					}
				})
			})
			.catch((error) => console.log(error));
	}
});

router.get('/login', (req, res) => {
	//Se revisa si no tiene un token de sesion
	if (typeof (req.cookies.id) == 'undefined') {
		let id = Math.random();
		res.cookie('id', id);
		res.render('login');
	}
	else {
		//Si ya tiene cookie de id e inicio sesion
		cuentas.findOne({ id: req.cookies.id }, (error, resultado) => {
			if (error)
				console.log(error);
			if (resultado)
				res.redirect('/');
			else {
				if (req.cookies.user) {
					let user = req.cookies.user
					res.clearCookie('user');
					res.render('login', { usuario: user });
				}

				else
					res.render('login');
			}
		});
	}
});

router.post('/login', (req, res) => {
	if (typeof (req.cookies.id) == 'undefined')
		res.redirect('/login');
	else {
		cuentas.findOne({ usuario: req.body.usuario, clave: req.body.clave }, (error, resultado) => {
			if (error)
				console.log(error);
			else {
				if (resultado) {
					res.clearCookie('attemps');
					resultado.id = req.cookies.id;
					resultado.activo = true;
					resultado.save((error) => {
						if (error)
							console.log(error);
						else {
							res.redirect('/');
						}
					});
				}
				else {
					res.cookie('user', req.body.usuario);
					res.redirect('/login');
				}
			}
		});
	}
});

router.use((req, res, next) => {
	if (typeof (req.cookies.id) != 'undefined') {
		cuentas.findOne({ id: req.cookies.id }, (error, resultado) => {
			if (error)
				console.log(error);
			else
				if (resultado)
					next();
				else
					res.redirect('/login');
		});
	}
	else
		res.redirect('/login');
});

router.get('/logout', (req, res) => {
	cuentas.findOne({ id: req.cookies.id }, (error, resultado) => {
		if (error)
			console.log(error);
		else {
			if (resultado) {
				resultado.id = -1;
				resultado.activo = false;
				resultado.save((error) => {
					if (error)
						console.log(error);
					else {
						for (cookie in req.cookies) {
							res.clearCookie(cookie);
						}
						res.redirect('/login');
					}
				});
			}
			else
				res.redirect('/login');
		}
	});;
});

module.exports = router;