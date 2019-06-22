const datefns = require('date-fns');

function diferencia(fecha) {
	return datefns.getDayOfYear(fecha) - datefns.getDayOfYear(new Date());
}

module.exports.diasDeDiferencia = diferencia;