// JavaScript para cambiar los logros cuando se hace clic en un grupo.
document.querySelector('#software-group').addEventListener('click', function() {
    document.getElementById('software-group-achievements').style.display = 'block';
    document.getElementById('web-programming-group-achievements').style.display = 'none';
});

document.querySelector('#web-programming-group').addEventListener('click', function() {
    document.getElementById('software-group-achievements').style.display = 'none';
    document.getElementById('web-programming-group-achievements').style.display = 'block';
});

// Función para mostrar los detalles del logro
function mostrarDetalles(detallesId) {
    const detalles = document.getElementById(detallesId);
    detalles.style.display = 'block';
}

// Función para cerrar los detalles del logro
function cerrarDetalles(detallesId) {
    const detalles = document.getElementById(detallesId);
    detalles.style.display = 'none';
}









