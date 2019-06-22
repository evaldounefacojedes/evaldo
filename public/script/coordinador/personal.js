busy = false;
function getElement(id) {
	return document.getElementById(id);
}
function getElements(clase) {
	return document.getElementsByClassName(clase);
}
function crearElemento(tag, color, texto, clase) {
	let aux = document.createElement(tag);
	if (color)
		aux.style.color = `rgb(${color})`
	if (texto != undefined)
		aux.innerText = texto;
	if (clase)
		aux.classList.add(clase);
	return aux;
}
function obtenerDatos(cedula, nombre) {
	peticion = new XMLHttpRequest();
	peticion.open('POST', '/informacionProfesor', true);
	peticion.setRequestHeader('Content-type', 'application/json;charset=UTF-8');
	peticion.overrideMimeType('json');
	peticion.onload = function () {
		items = JSON.parse(peticion.responseText).recaudos;
		tabla = getElement('tablaProfesor').children[0].children[0];
		for (let i = 1; i < tabla.childElementCount;) {
			tabla.removeChild(tabla.children[1]);
		}
		items.forEach((item) => {
			let tr = crearElemento('tr');
			tr.appendChild(crearElemento('td', undefined, item.nombre));
			tr.appendChild(crearElemento('td', undefined, item.estado ? 'O' : 'X', 'estadoBtn'));
			item.fechaEntregaF ? fechaTD = crearElemento('td', undefined, item.fechaEntregaF, 'fechaCell') : fechaTD = crearElemento('td', undefined, undefined, 'fechaCell');
			tr.appendChild(fechaTD);
			tr.appendChild(crearElemento('td', undefined, item.nota, 'notaBtn'));
			tabla.appendChild(tr);
		});
		actualizarBotones();
		getElement('busy').style.display = 'none';
	}
	peticion.send(JSON.stringify({ cedula: cedula, nombre: nombre }));
};
function actualizarBotones() {
	function pedirNota() {
		let nota = prompt('ingrese la nota');
		if (Number.isInteger(nota == "" ? NaN : Number(nota)) && Number(nota) >= 0 && Number(nota) <= 100) {
			return nota;
		}
		else {
			alert('Nota invalida');
			return undefined;
		}
	}
	Array.prototype.forEach.call(getElements('estadoBtn'), (boton) => {
		boton.style.cursor = 'pointer';
		boton.onclick = (event) => {
			if (event.target.innerText == 'X') {
				nota = pedirNota();
				if (nota != undefined) {
					event.target.innerText = 'O'
					event.target.parentNode.children[3].innerText = nota;
				}
			}
			else {
				event.target.innerText = 'X'
				event.target.parentNode.children[3].innerText = 0;
			}
		}
	});
	Array.prototype.forEach.call(getElements('notaBtn'), (boton) => {
		boton.style.cursor = 'pointer';
		boton.onclick = (event) => {
			if (event.target.parentNode.children[1].innerText == 'O') {
				nota = pedirNota();
				if (nota == undefined) {
					if (event.target.innerText == '')
						event.target.innerText = 0;
				}
				else {
					event.target.innerText = nota;
				}
			}
			else {
				alert('Este item no ha sido entregado');
			}
		}
	});
}
function guardarDatos() {
	function getDatos() {
		let arrayDatos = [];
		tabla = getElement('tablaProfesor').children[0].children[0];
		for (i = 1; i < tabla.childElementCount; i++) {
			let objetoDatos = {}
			objetoDatos.nombre = tabla.children[i].children[0].innerText;
			objetoDatos.estado = tabla.children[i].children[1].innerText == 'O' ? true : false;
			objetoDatos.nota = Number(tabla.children[i].children[3].innerText);
			arrayDatos.push(objetoDatos);
		}
		return arrayDatos;
	}
	peticion = new XMLHttpRequest();
	peticion.open('POST', '/actualizarProfesor', true);
	peticion.setRequestHeader('Content-type', 'application/json;charset=UTF-8');
	peticion.overrideMimeType('json');
	peticion.onload = function () {
		let respuesta = JSON.parse(peticion.responseText);
		if (respuesta.estado) {
			alert(`${respuesta.mensaje}`);
			location.reload();
		}
		else
			alert(`Error: ${respuesta.mensaje}`);
	}
	peticion.send(JSON.stringify({ documentos: getDatos() }));
}
function mostrarFechas() {
	let modalFechas = document.getElementById("modalFechas");
	tabla = modalFechas.querySelector('tbody');
	for (let i = 1; i < tabla.childElementCount;) {
		tabla.removeChild(tabla.children[1]);
	}
	modalFechas.style.display = "block";
	peticion = new XMLHttpRequest();
	peticion.open('POST', '/informacionProfesor', true);
	peticion.setRequestHeader('Content-type', 'application/json;charset=UTF-8');
	peticion.overrideMimeType('json');
	peticion.onload = function () {
		documentos = JSON.parse(peticion.responseText).recaudos;
		Array.prototype.forEach.call(documentos, (documento) => {

			let tr = crearElemento('TR').appendChild(crearElemento('TD', null, documento.nombre, null)).parentNode;
			tabla.appendChild(tr);

			let input = crearElemento('input');
			let td = crearElemento('TD').appendChild(input).parentNode
			input.value = documento.fechaI;
			flatpickr(input, { altInput: true, altFormat: 'j \\d\\e F \\d\\e\\l Y', dateFormat: 'm-d-Y' });
			tr.appendChild(td);
			tabla.appendChild(tr);

			input = crearElemento('input');
			td = crearElemento('TD').appendChild(input).parentNode
			input.value = documento.fechaF;
			flatpickr(input, { altInput: true, altFormat: 'j \\d\\e F \\d\\e\\l Y', dateFormat: 'm-d-Y' });
			tr.appendChild(td);
			tabla.appendChild(tr);
		});
	}
	peticion.send(JSON.stringify({ cedula: 'none', nombre: 'none' }));
}
function guardarFechas() {
	tabla = document.querySelector('#modalFechas tbody');
	documentos = [];
	for (let i = 1; i < tabla.childElementCount; i++) {
		let documento = {};
		documento.nombre = tabla.children[i].children[0].innerText;
		documento.fechaI = tabla.children[i].children[1].children[0].value;
		documento.fechaF = tabla.children[i].children[2].children[0].value;
		documentos.push(documento);
	}
	peticion = new XMLHttpRequest();
	peticion.open('POST', '/actualizarFechas', true);
	peticion.setRequestHeader('Content-type', 'application/json;charset=UTF-8');
	peticion.overrideMimeType('json');
	peticion.onload = function () {
		respuesta = JSON.parse(peticion.responseText);
		if (respuesta.estado) {
			alert('Cambios guardados exitosamente');
			location.reload();
		}
	};
	peticion.send(JSON.stringify({ documentos: documentos }));
}
window.onload = () => {
	//-------------------Registro------------------
	getElement('registrarBtn').onclick = () => getElement('modalRegistrar').style.display = 'block';
	getElement("registroForm").onsubmit = (event) => {
		getElement('busy').style.display = 'block';
		let datosForm = new FormData(registroForm);
		let peticion = new XMLHttpRequest();
		let datosObj = {};
		event.preventDefault();
		peticion.open("POST", '/database/registrarProfesor', true);
		peticion.setRequestHeader('Content-type', 'application/json;charset=UTF-8');
		peticion.overrideMimeType('json');
		datosForm.forEach(function (value, key) {
			datosObj[key] = value;
		});
		peticion.onload = function () {
			let respuesta = JSON.parse(peticion.responseText);
			getElement('modalRegistrar').style.display = 'none'
			if (respuesta.estado) {
				alert(respuesta.mensaje);
			}
			else {
				alert(`Error: ${respuesta.mensaje}`)
			}
			location.reload();
		};
		peticion.send(JSON.stringify(datosObj));
	}
	//----------------Eliminar profesor--------------
	getElement('eliminarBtn').onclick = () => {
		getElement('modalEliminar').style.display = 'block';
		getElement('modalEliminar').children[0].focus();
	}
	getElement('modalEliminar').onsubmit = (event) => {
		getElement('busy').style.display = 'block';
		let datosForm = new FormData(eliminarForm);
		let peticion = new XMLHttpRequest();
		let datosObj = {};
		event.preventDefault();
		peticion.open("POST", '/database/eliminarProfesor', true);
		peticion.setRequestHeader('Content-type', 'application/json');
		peticion.overrideMimeType('json');
		datosForm.forEach(function (value, key) {
			datosObj[key] = value;
		});
		datosObj.sure = false;
		peticion.onload = function () {
			let respuesta = JSON.parse(peticion.responseText);

			if (respuesta.found) {
				if (!getElement('errorProfesorNotFound') == null) {

					document.removeChild(getElement('errorProfesorNotFound'));
				}
				getElement('modalEliminar').style.display = 'none';

				let quest = confirm(`¿Esta seguro de que desea elimina a el profesor ${respuesta.nombre} ${respuesta.apellido}?`)
				quest = false;
				if (quest) {
					eliminarProfesor(respuesta.cedula);
				}
				else {
					document.querySelector('#modalEliminar .cancelarBtn').click();
					getElement('busy').style.display = 'none';
				}

			}

			else {
				if (getElement('errorProfesorNotFound') == null) {
					let h2 = crearElemento('h2', '200,20,20', 'Error profesor no encontrado');
					h2.id = 'errorProfesorNotFound';
					document.querySelector('#modalEliminar .contenedorModal').appendChild(h2);
				}
			}
		};
		peticion.send(JSON.stringify(datosObj));
	};
	//------------------Confirmar Eliminar-------------
	function eliminarProfesor(cedula) {
		let peticion = new XMLHttpRequest();
		let datosObj = {};
		datosObj.sure = true;
		datosObj.cedula = cedula;
		peticion.open("POST", '/database/eliminarProfesor', true);
		peticion.setRequestHeader('Content-type', 'application/json;charset=UTF-8');
		peticion.overrideMimeType('json');
		peticion.onload = function () {
			let respuesta = JSON.parse(peticion.responseText);
			getElement('busy').style.display = 'none';
			if (respuesta.estado)
				alert(respuesta.mensaje);
			else
				alert(`Error: ${mensaje}`);
			location.reload();
		};
		peticion.send(JSON.stringify(datosObj));
	}

	//------------------Botones Cancelar---------------
	Array.prototype.forEach.call(getElements("cancelarBtn"), (boton) => {
		boton.onclick = (evento) => {
			document.querySelector("#modalEliminar .cedula").value = '';
			contenedorModal = evento.target;
			do {
				contenedorModal = contenedorModal.parentNode;
				console.log(contenedorModal.tagName);
			}
			while (contenedorModal.className !== "contenedorModal")
			contenedorModal.parentNode.style.display = "none";
		}
	});

	//------------------Hacer a los profesores clickables
	Array.prototype.forEach.call(getElements('profesorClickable'), (profesor) => {
		profesor.onclick = (event) => {
			if (event.target.nodeName == "TD") {
				fila = event.target.parentNode;
				objeto = {
					nombre: fila.children[0].textContent,
					apellido: fila.children[1].textContent,
					cedula: fila.children[2].textContent,
					estado: fila.children[3].textContent
				}
				getElement('busy').style.display = 'block';
				obtenerDatos(objeto.cedula, objeto.nombre);
				getElement('modalProfesor').style.display = 'block';
				getElement('nombreProfesor').innerText = `Profesor ${objeto.nombre} ${objeto.apellido}`
			}
		}
	});

	//------------------Guardar cambio
	document.querySelector('#modalProfesor  .enviarBtn').onclick = guardarDatos;

	// -----------------Fechas
	document.getElementById("fechasBtn").onclick = mostrarFechas;
	document.querySelector('#modalFechas .enviarBtn').onclick = guardarFechas;
}