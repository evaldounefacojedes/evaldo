
function getElement(element){
	return document.getElementById(element);
}
function getElements(element){
	return document.getElementsByClassName(element);
}
function obtenerDatos(cedula, nombre) {
	peticion = new XMLHttpRequest();
	peticion.open('POST', '/informacionProfesor', true);
	peticion.setRequestHeader('Content-type', 'application/json;charset=UTF-8');
	peticion.overrideMimeType('json');
	peticion.onload = function ()
	{
		mostrarProfesor(JSON.parse(peticion.responseText));
	}
	peticion.send(JSON.stringify({cedula: cedula, nombre: nombre}));
};
function obtenerRecaudos(){
	recaudos = [];
	var tabla = document.querySelector('#tablaRecaudos tbody');
	
	for(let i = 1; i < tabla.childElementCount; i++)
	{
		let objetoAux = {};
		objetoAux.nombre = tabla.children[i].children[0].innerText;
		objetoAux.entregado = tabla.children[i].children[1].innerText == 'O' ? true : false;
		recaudos.push(objetoAux);
	}

	return recaudos;
}
function mostrarProfesor(datos){
	document.getElementById('nombreProfesor').innerText = `Profesor ${datos.nombre}`;
	tabla = document.querySelector('#modalProfesor tbody');
	while(tabla.childElementCount > 1)
	{
		tabla.removeChild(tabla.children[1]);
	}
	datos.recaudos.forEach((recaudo)=>{
		let tr = document.createElement('tr');

		let td = document.createElement('td');
		td.innerText = recaudo.nombre;
		tr.appendChild(td);

		td = document.createElement('td');
		td.innerText = recaudo.entregado ? 'O' : 'X';
		td.className = 'entregadoBtn';
		td.onclick = (event)=>{
			if(event.target.nodeName == 'TD')
			{
				event.target.innerText == 'O' ? event.target.innerText = 'X' : event.target.innerText = 'O'; 
			}
		}
		tr.appendChild(td);

		tabla.appendChild(tr)
	})
	modalProfesor.style.display = 'block';
}
function actualizarBotones(){
	let nombresBtns = document.getElementsByClassName('nombreBtn');
	let entregadosBtns = document.getElementsByClassName('entregadoBtn');
	let eliminarBtns = document.getElementsByClassName('eliminarBtn');
	let botonesFecha = document.getElementsByClassName("fechaBtn");
	for(let i = 0; i < nombresBtns.length; i++)
	{
		nombresBtns[i].onclick = (e) => {
			nombre = window.prompt('Ingrese el nuevo nombre').toUpperCase();
			if(nombre != null && nombre.length >= 2)
				{
					e.target.innerText = nombre;
				}
		}
	}
	for(let i = 0; i < entregadosBtns.length; i++)
	{
		entregadosBtns[i].onclick = (e) => {
			if(e.target.innerText.toUpperCase() == 'X')
			{
				e.target.innerText = 'O';
				e.target.className = "entregadoBtn";
			}
			else if (e.target.innerText.toUpperCase() == 'O')
			{
				e.target.innerText = 'X';
				e.target.className += " " + "noEntregado"
			}
		}
	}
	for(let i = 0; i < eliminarBtns.length; i++)
	{
		eliminarBtns[i].onclick = (e) => {
			let fila = e.target.parentNode;
			fila.parentNode.removeChild(fila);
		}
	}
	for(let i = 0; i < botonesFecha.length; i++)
	{
		botonesFecha[i].onclick = (e)=>{
			if(e.target.nodeName == "TD")
				{
					e.target.children[1].focus();
				}
		}
		
	}
}
function agregarNuevaFila(boton){
	tabla = boton.parentNode
	tabla.removeChild(boton);
	tabla.appendChild(generarFila({nombre: "NOMBRE"}));
	tabla.appendChild(boton);
	actualizarBotones();
}
function generarFila(datos)
{
		let filaNueva = document.createElement('tr');
		let celda = document.createElement('td');
		
		celda.innerText = datos.nombre;
		filaNueva.appendChild(celda);
		celda.className = 'nombreRecaudo';
		celda.onclick = (event)=>{
			let nombre = prompt('Ingrese el nombre del recaudo');
			if(typeof(nombre) == "string" && nombre != '')
				{
					event.target.innerText = nombre;
				}
		}

		celda = celda.cloneNode();
		celda.innerText = 'X';
		celda.className = 'eliminarRecaudo';

		celda.onclick = (event)=>{
			event.target.parentNode.parentNode.removeChild(event.target.parentNode);
		}
		filaNueva.appendChild(celda);

		return filaNueva;
}
function getDocumentosBase(){
	let peticion = new XMLHttpRequest();
	peticion.open('POST', '/eventos', true);
	peticion.setRequestHeader('Content-type', 'application/json;charset=UTF-8');
	peticion.overrideMimeType('json');
	peticion.onload = ()=>{
		let documentos = JSON.parse(peticion.responseText).documentos;
		if(documentos == undefined)
			return;
		let tabla = document.querySelector('#modalDocumentos tbody');
		for(; 2 < tabla.childElementCount;)
		{	
			tabla.removeChild(tabla.children[1]);
		}
		let addBoton = tabla.children[1];
		tabla.removeChild(addBoton);

		documentos.forEach((documento)=>{
			let tr = document.createElement('tr');
			let td = document.createElement('td');
			td.innerText = documento;
			td.className = 'nombreRecaudo';
			tr.appendChild(td);
			
			td = document.createElement('td');
			td.className = 'eliminarRecaudo';
			td.innerText = 'X';
			tabla.appendChild(tr.appendChild(td).parentNode);
		});
		tabla.appendChild(addBoton);
		Array.prototype.forEach.call(getElements('eliminarRecaudo'), (boton)=>{
			boton.onclick = (event)=>{
				event.target.parentNode.parentNode.removeChild(event.target.parentNode)
			}
		})
		Array.prototype.forEach.call(getElements('nombreRecaudo'), (boton)=>{
			boton.onclick = (event)=>{
				let nombre = prompt('Ingrese el nombre del recaudo');
				if(typeof(nombre) == "string" && nombre != '')
					{
						event.target.innerText = nombre;
					}
			}
		})
	}
	peticion.send(JSON.stringify({cedula: 'none'}));
};
window.onload = () => {	
	let listaProfesores = getElements('profesorClickable');
	let agregarBtn = getElement('nuevoRecaudo');
	let guardarProfesor = getElement('guardarProfesor');
	let guardarDocumentos = getElement('guardarDocumentos');
	let botonDocumentos = getElement('botonDocumentos');

	cancelarBtn = getElements('cancelarBtn');
	Array.prototype.forEach.call(cancelarBtn, (boton) => {
		boton.onclick = (event)=>{
		let element = event.target.parentNode;
		while(!element.classList.contains("contenedorModal"))
		{
			element = element.parentNode
		}
		element.parentNode.style.display = 'none';		
	}
	});

	for(let i = 0; i < listaProfesores.length; i++)
	{
		listaProfesores[i].onclick = (e) => {
			if(e.target.nodeName = "TD")
			{	
				obtenerDatos(e.target.parentNode.childNodes[2].innerText, `${e.target.parentNode.childNodes[0].innerText} ${e.target.parentNode.childNodes[2].innerText}`);
			}
		};
	}

	agregarBtn.onclick = () =>
	{
		agregarNuevaFila(agregarBtn);
	}
	guardarProfesor.onclick = ()=>{
		if(window.confirm("Esta seguro de querer guardar los cambios?") == true)
		{
			peticion.open('POST', '/actualizarProfesor', true);
			peticion.setRequestHeader('Content-type', 'application/json;charset=UTF-8');
			peticion.overrideMimeType('json');
			peticion.onload = () =>
			{
				respuesta = JSON.parse(peticion.responseText);
				alert('Datos guardados exitosamente');
				location.reload();
			};
			recaudos = {recaudos: obtenerRecaudos()}
			recaudos = JSON.stringify(recaudos);
			peticion.send(recaudos);
		}
	};
	botonDocumentos.onclick = (event)=>{
		document.getElementById('modalDocumentos').style.display = 'block';
		getDocumentosBase();
	}
	guardarDocumentos.onclick = (event)=>{
		if(window.confirm("Esta seguro de querer guardar los cambios?") == true)
			{
				let peticion = new XMLHttpRequest();
				peticion.open('POST', '/actualizarProfesor', true);
				peticion.setRequestHeader('Content-type', 'application/json;charset=UTF-8');
				peticion.overrideMimeType('json');
				peticion.onload = () =>
				{
					respuesta = JSON.parse(peticion.responseText);
					alert('Datos guardados exitosamente');
					location.reload();
				};
				let tabla = event.target.parentNode;
				tabla = tabla.querySelector('tbody')
				let documentosList = [];
				Array.prototype.forEach.call(tabla.children, (documento)=>{
					if(!documento.id && documento.children[0].nodeName != 'TH')
						documentosList.push(documento.children[0].innerText);
				});
				peticion.send(JSON.stringify({recaudos: documentosList}));
			}	
	}
}