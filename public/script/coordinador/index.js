var peticionEventosAlertas = new XMLHttpRequest();
var peticionEventosIniciados = new XMLHttpRequest();
function getElement(id){
	return document.getElementById(id);
}
function crearElemento(tag, color, texto, clase){
	let aux = document.createElement(tag);
	if(color)
		aux.style.color = `rgb(${color})`
	if(texto)
		aux.innerText = texto;
	if(clase)
		aux.classList.add(clase);
	return aux;
}
peticionEventosIniciados.open('POST', '/informacionProfesor', true);
peticionEventosIniciados.setRequestHeader('Content-type', 'application/json;charset=UTF-8');
peticionEventosIniciados.overrideMimeType('json');
peticionEventosIniciados.onload = ()=>{
	let recaudos = JSON.parse(peticionEventosIniciados.responseText).recaudos;
	tabla = document.querySelector('#eventosIniciados table');
	for(val in recaudos)
	{
		if(recaudos[val].fechaI == '')
			continue;
		let td = document.createElement('td');
		td.innerText = `${recaudos[val].nombre} - ${recaudos[val].fechaI}`;
		let tr = document.createElement('tr').appendChild(td).parentNode;
		tabla.appendChild(tr);	
	}
};
peticionEventosIniciados.send(JSON.stringify({cedula: 'none', iniciados: true, fechaRaw: false}));


peticionEventosAlertas.open('POST', '/eventos', true);
peticionEventosAlertas.setRequestHeader('Content-type', 'application/json;charset=UTF-8');
peticionEventosAlertas.overrideMimeType('json');
peticionEventosAlertas.onload = ()=>{
	let respuesta = JSON.parse(peticionEventosAlertas.responseText);
	let eventos = respuesta.eventosPendientes;
	let alertas = respuesta.advertencias;
	calendarioEventos = getElement("calendarioEventos").children[0];
	calendarioAlertas = getElement("calendarioAlertas").children[0];
	if(eventos.length == 0){
		getElement('eventos').appendChild(crearElemento('h2', '0,220,0', 'Parece que no hay nada por aquí'));
	}
	if(alertas.length == 0){
		getElement('alertas').appendChild(crearElemento('h2', '0,220,0', 'Parece que no hay nada por aquí'));
	}
	eventos.forEach(grupoEventos => {
		let trFechas = crearElemento('tr',null,null,"tituloEvento").appendChild(crearElemento('td',null,grupoEventos.fechaEntregaF)).parentNode;
		calendarioEventos.appendChild(trFechas);
		for(evento in grupoEventos.eventos)
		{
			let trEvento = crearElemento('tr',null,null,"tituloAlerta").appendChild(crearElemento('td',null,evento)).parentNode;
			trFechas.appendChild(trEvento);
			grupoEventos.eventos[evento].forEach((profesor)=>{
				let trProfesor = crearElemento('tr',null,null,"tituloAlerta").appendChild(crearElemento('td',null,profesor)).parentNode;
				trEvento.appendChild(trProfesor);
			});
		}
	});
	alertas.forEach(grupoAlertas => {
		let trFechas = crearElemento('tr',null,null,"tituloAlerta").appendChild(crearElemento('td',null,grupoAlertas.fechaEntregaF)).parentNode;
		calendarioAlertas.appendChild(trFechas);
		for(evento in grupoAlertas.eventos)
		{
			let trEvento = crearElemento('tr',null,null,"tituloAlerta").appendChild(crearElemento('td',null,evento)).parentNode;
			trFechas.appendChild(trEvento);
			grupoAlertas.eventos[evento].forEach((profesor)=>{
				let trProfesor = crearElemento('tr',null,null,"tituloAlerta").appendChild(crearElemento('td',null,profesor)).parentNode;
				trEvento.appendChild(trProfesor);
			});
		}
	});
};
peticionEventosAlertas.send();
