var cedulaGlobal = '';
function getElement(query)
{
	return document.querySelector(query);
}
function getElements(clase)
{
	return document.getElementsByClassName(clase);
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
getElement('#botonListado').onclick = ()=>{
	let peticion = new XMLHttpRequest();
	peticion.open("POST", '/listadoDeProfesores', true);
	peticion.setRequestHeader('Content-type', 'application/json;charset=UTF-8');
	peticion.overrideMimeType('json');

	peticion.onload = ()=>{
		respuesta = JSON.parse(peticion.responseText);
		tabla = getElement('#tablaListado');
		while(tabla.childElementCount > 1)
		{
			tabla.removeChild(tabla.children[1]);
		}
		respuesta.profesores.forEach((profesor)=>{
			let tr = document.createElement('tr');
			let td = document.createElement('td');

			td.innerText = profesor.nombre;
			tr.appendChild(td);

			td = document.createElement('td');
			td.innerText = profesor.apellido;
			tr.appendChild(td);

			td = document.createElement('td');
			td.innerText = profesor.cedula;
			tr.appendChild(td);

			// if(profesor.carrera.length == 1)
			// {
			// 	td = document.createElement('td');
			// 	td.innerText = profesor.carrera[0];
			// 	tr.appendChild(td);
			// }
			// else{
				td = document.createElement('td');
				td.innerHTML = '';
				for(let i = 0; i < profesor.carrera.length; i++)
				{
					td.innerHTML+= profesor.carrera[i];
					if(profesor.carrera[i+1])
						td.innerHTML+= '<br>';
				}
				tr.appendChild(td);
			// }
			tabla.appendChild(tr);
		});
		getElement('#modalListado').style.display ='block';
	}
	
	peticion.send();
}

getElement('#nuevoPeriodo').onclick = ()=>{
	if(confirm('Esta opción inicia un nuevo periodo académico y elimina todo el registro de profesores\n¿Esta seguro de proseguir?'))
	{
		let nuevoPeriodo = '', codigo = '';
		nuevoPeriodo = prompt('Ingrese el nombre del nuevo periodo académico.')
		if(typeof(nuevoPeriodo) != 'string' || nuevoPeriodo.length <= 4){
			alert('Error: El nombre del periodo debe tener al menos 4 caracteres');
			return
		}
		else{
			if(!confirm(`Ingresó el nombre ${nuevoPeriodo}. ¿Es correcto?`))
				return
		}
		for(let i = 0; i < 5; i++){
			codigo += Math.floor(Math.random() * 10).toString();
		}
		let confirmacion = prompt(`Ingrese el código ${codigo} como método de confirmación`);
		if(Number.parseInt(confirmacion) != Number.parseInt(codigo)){
			alert('Error: El código de confirmación es diferente al generado');
			return;
		}
		else{
			peticion = new XMLHttpRequest();
			peticion.open('POST', '/nuevoPeriodo');
			peticion.setRequestHeader('Content-type', 'application/json;charset=UTF-8');
			peticion.overrideMimeType('json');

			peticion.onload = ()=>{
				respuesta = JSON.parse(peticion.responseText);
				if(!respuesta.estado)
				{
					alert(`Error: ${respuesta.mensaje}`);
					return;
				}
				else if(respuesta.estado && respuesta.trabajando)
				{
					setTimeout(()=>{
						peticion.open('POST', '/nuevoPeriodo');
						peticion.setRequestHeader('Content-type', 'application/json;charset=UTF-8');
						peticion.overrideMimeType('json');
						peticion.send();
					}, 2000);
					Array.prototype.forEach.call(document.getElementsByTagName('*'), (elemento)=>{
						elemento.style.cursor = 'wait';
						elemento.onclick = (e)=>{e.preventDefault()};
					});
					document.onclick = (e)=>{
						e.stopPropagation();
						e.preventDefault();
					}
					getElement('#modalWait').style.display = 'block';
				}
				else if(respuesta.estado){
					alert(respuesta.mensaje);
					location.reload();
				}
			}
			peticion.send(JSON.stringify({periodoAcademico: nuevoPeriodo}));
		}
	}
	return;
}

Array.prototype.forEach.call(getElements('cancelarBtn'), (boton)=>{
	if(boton.id == 'descargar')
		return;
	boton.onclick = (event)=>{
	modal = event.target.parentElement
	while(!modal.classList.contains('contenedorModal'))
	{
		modal = modal.parentElement;
	}
	modal = modal.parentElement;
	modal.style.display = 'none';
	}
});
