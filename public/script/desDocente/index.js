var peticion = new XMLHttpRequest();
function getElement(id){
	return document.getElementById(id);
}
function print(mensaje){
	console.log(mensaje);
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
peticion.open('POST', '/eventos', true);
peticion.setRequestHeader('Content-type', 'application/json;charset=UTF-8');
peticion.overrideMimeType('json');
peticion.onload = ()=>{
	let documentos = JSON.parse(peticion.responseText).documentos;
	let calendarioEventos = getElement("calendarioEventos").children[0];
	if(Object.keys(documentos).length == 0){
		getElement('eventos').appendChild(crearElemento('h2', '0,220,0', 'Parece que no hay nada por aquí'));
	}
	for(val in documentos)
	{
		let tr = crearElemento('tr',null,null,"tituloEvento").appendChild(crearElemento('td',null,val)).parentNode;
		calendarioEventos.appendChild(tr);
		documentos[val].forEach(evento => {
			let td = crearElemento('td').appendChild(crearElemento('p',null,evento,'evento')).parentNode;
			tr.appendChild(crearElemento('tr').appendChild(td).parentNode);
		});	
	};
};
peticion.send(JSON.stringify({entregado: false}));
