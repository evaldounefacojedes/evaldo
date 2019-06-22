function sleep(ms){
	return new Promise(resolve => setTimeout(resolve, ms));
}

document.getElementById("forgotPass").onclick = ()=>{
	let usuario = prompt('Ingrese su usuario');
	if(typeof(usuario) != "string" || usuario.length < 4)
		return;
	let peticion = new XMLHttpRequest();
	peticion.open('POST', '/recoveryPassword',true);
	peticion.setRequestHeader('Content-type', 'application/json;charset=UTF-8');
	peticion.onload = ()=>{
		let respuesta = JSON.parse(peticion.responseText);
		if(respuesta.estado){
			let preguntar = async function(){
				let respuesta = confirm('¿Ya tiene el código a la mano?')
				if(typeof(respuesta) != 'boolean')
				{
					await sleep(1000);
				}
				else{
					if(respuesta === true)
					{
						codigo = prompt('Ingrese el código recibido');
						alert('Ahora ingrese su nueva contraseña');
						let clave = prompt('Ingrese la nueva contraseña')
						let cambiarPassReq = new XMLHttpRequest();
						cambiarPassReq.open('POST', '/recoveryPassword',true);
						cambiarPassReq.setRequestHeader('Content-type', 'application/json;charset=UTF-8');
						cambiarPassReq.overrideMimeType('json');
						this.resolve
						cambiarPassReq.onload = () => {
							let respuesta = JSON.parse(cambiarPassReq.responseText);
							alert(respuesta.mensaje);
						}
						cambiarPassReq.send(JSON.stringify({usuario: usuario, codigo: codigo, clave: clave}));
					}
					else{
						location.reload();
					}
				}
			}
			preguntar();
		}
		else{
			alert(respuesta.mensaje);
		}
	}
	peticion.send(JSON.stringify({usuario: usuario}));
}