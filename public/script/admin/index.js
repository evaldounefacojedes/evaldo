function getElement(id){
		return document.getElementById(id);
	}
function getElements(clase){
		return document.getElementsByClassName(clase);
}

window.onload = () => {
	
	//--------------- Registro--------------
	getElement('registrarBtn').onclick = ()=>{
		getElement('modalRegistrar').style.display = 'block';
	}
	getElement("cancelarRegistroBtn").onclick = ()=>{
		getElement("modalRegistrar").style.display = 'none';
	};
	getElement("tipo").onchange = (e) =>{
		let carrera = getElement("carrera");
		if(e.target.value != 'Coordinador de carrera')
			carrera.setAttribute("disabled", true);
		else
			carrera.removeAttribute("disabled")
	}

	getElement('registroForm').onsubmit = (e) => {
		e.preventDefault();
		let datosObj = {};
		new FormData(registroForm).forEach( (value, key)=>{datosObj[key] = value;} );
		if(getElement("tipo").value != 'Coordinador de carrera')
			delete datosObj.carrera;

		let req = new XMLHttpRequest();
		req.open("POST", '/database/registrarUsuario', true);
		//Haders para usar JSON
		req.setRequestHeader('Content-type', 'application/json;charset=UTF-8');
		req.overrideMimeType('json');

		req.onload = function() {
			respuesta = JSON.parse(req.responseText) ;
			getElement('modalRegistrar').style.display ='none';
			mensajeTexto = getElement('mensajeTexto');
			
			if(respuesta.estado){
				alert(respuesta.mensaje)
				location.reload();
			}
			else{
				alert(`Error ${respuesta.mensaje}`);
				location.reload();
			}
		};
		req.send(JSON.stringify(datosObj));
	}

	// -------------- Eliminar --------------
	Array.prototype.forEach.call(getElements('usuarioListado'), (element) => {
		element.onclick = (event)=>{
			if(event.target.tagName == "TD")
			{
				let usuario = event.target.parentNode.children[1].innerText
				if(confirm(`Atención\n¿Eliminar al usuario ${usuario}?`))
				{
					eliminarUsuario(usuario);
				}
			}
		};
	});

	function eliminarUsuario (usuario){
		let datosObj = {};
		let req = new XMLHttpRequest();
		req.open("POST", '/database/eliminarUsuario', true);
		req.setRequestHeader('Content-type', 'application/json;charset=UTF-8');
		req.overrideMimeType('json');
		datosObj.usuario = usuario;
		req.onload = function() {
			respuesta = JSON.parse(req.responseText) ;
			if(respuesta.estado){
				alert(respuesta.mensaje)
				location.reload();
			}
			else{
				alert(`Error: ${respuesta.mensaje}`);
				location.reload();
			}
		};
		req.send(JSON.stringify(datosObj));
	}
}
