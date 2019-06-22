var cedulaGlobal = '';
function getElement(query)
{
	return document.querySelector(query);
}
function getElements(clase)
{
	return document.getElementById(clase);
}
getElement('#botonBuscar').onclick = ()=>{
	let cedula = prompt('Introduzca el número de cedula del profesor a consultar');
	if(cedula == "" || cedula == null)
	{
		return;
	}
	if(typeof(cedula) != 'string' || cedula.search(/\d{1,2}.\d{3}.\d{3}/) != 0)
	{
		alert('Cedula no valida')
		return;
	}
	cedulaGlobal = cedula;
	buscarProfesor(cedula, false);
}
getElement('#descargar').onclick = ()=>{
	buscarProfesor(cedulaGlobal, true);
}
function buscarProfesor(cedula, pdf){
	let peticion = new XMLHttpRequest();
	peticion.open("POST", '/resultadoProfesor', true);
	peticion.setRequestHeader('Content-type', 'application/json;charset=UTF-8');
	peticion.overrideMimeType('json');
	peticion.onload = ()=>{
		respuesta = JSON.parse(peticion.responseText);
		if(respuesta.pdf && respuesta.encontrado)
		{
			window.location.href = '/resultadoProfesor';
			return;
		}
		if(!respuesta.encontrado){
			alert(`Error: ${respuesta.mensaje}`);
			return;
		}
		getElement('.resumen#notaAbsoluta').innerText = `Nota absoluta: ${respuesta.notaAbsoluta}`;
		getElement('.resumen#notaRelativa').innerText = `Nota relativa: ${respuesta.notaRelativa}`;
		getElement('.resumen#nombreProfesor').innerText = `Profesor ${respuesta.profesor.nombre} ${respuesta.profesor.apellido}`;
		getElement('.resumen#cedulaProfesor').innerText = `Cedula ${respuesta.profesor.cedula}`;

		let tabla = getElement('.resumen#tablaEvaluaciones');
		for(let i = 1; i < tabla.childElementCount;)
			tabla.removeChild(tabla.children[i]);

		respuesta.notas.forEach((evaluacion)=>{
			let tr = document.createElement('tr');
			let td = document.createElement('td');
			td.innerText = evaluacion.nombre;
			tr.appendChild(td);

			if(evaluacion.evaluado)
			{
				td = document.createElement('td');
				td.innerText = evaluacion.puntos;
				td.style.textAlign = 'center';
				td.style.borderLeft = '2px solid black';
				td.style.borderRight = '2px solid black';
				tr.appendChild(td);	

				td = document.createElement('td');
				td.innerText = evaluacion.nota;
				td.style.textAlign = 'center';
				td.style.borderLeft = '2px solid black';
				td.style.borderRight = '2px solid black';
				tr.appendChild(td);
			}
			else{
				td = document.createElement('td');
				td.innerText = 'No evaluado';
				td.setAttribute('colspan', '2');
				td.style.textAlign = 'center';
				td.style.borderLeft = '2px solid black';
				td.style.borderRight = '2px solid black';
				td.style.color = 'red';
				tr.appendChild(td);
			}

			td = document.createElement('td');
			td.innerText = evaluacion.porcentaje;
			td.style.textAlign = 'center';
			tr.appendChild(td);

			tabla.appendChild(tr);
		})
		getElement('#modalResumenProfesor').style.display ='block';
	}
	peticion.send(JSON.stringify({cedula: cedula, pdfFile: pdf}));
}


getElement('#modalResumenProfesor input.cancelarBtn').onclick = (event)=>{
	modal = event.target.parentElement
	while(modal.id != 'modalResumenProfesor')
	{
		modal = modal.parentElement;
	}
	modal.style.display = 'none';
}