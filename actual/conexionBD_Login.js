const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Conexión a la base de datos de XAMPP
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'taskmasterdb'
});

db.connect((err) => {
    if(err) throw err;
    console.log('Conectado a la base de datos');
});

// Ruta de registro
app.post('/register', (req, res) => {
    const { username,password,email } = req.body;
    // Convertir el nombre de usuario a mayúsculas para evitar duplicados insensibles a mayúsculas/minúsculas
    
    const usernameUpper=username.toUpperCase();
    
    // Verificar si el usuario ya existe
    db.query('SELECT * FROM users WHERE username = ?', [usernameUpper], (error, results) => {
        if (error) {
            return res.status(500).send({ message: 'Error en el servidor' });
        }
        if (results.length > 0) {
            return res.status(400).send({ message: 'El correo ingresado ya está en uso' });
        }
        // Insertar el usuario en la base de datos
        db.query('INSERT INTO users (username, password, email) VALUES (?, ?, ?)', [usernameUpper, password, email], (error, results) => {
            if (error) {
                return res.status(500).send({ message: 'Error al registrar el usuario' });
            }
            // Usuario registrado, redirigir al inicio de sesión

            return res.status(200).send({ message: 'Registro exitoso, por favor inicie sesión.' });
            window.location.href = 'login.html'; // Asumiendo que 'login.html' es la página de inicio de sesión
           

        });
    });
});

// Ruta de inicio de sesión
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    // Convertir el nombre de usuario a mayúsculas para la comparación
    const usernameUpper = username.toUpperCase();

    // Verificar el usuario y la contraseña
    db.query('SELECT * FROM users WHERE UPPER(username) = ?', [usernameUpper], (error, results) => {
        if (error) {
            return res.status(500).send({ message: 'Error en el servidor' });
        }
        if (results.length === 0 || password !== results[0].password) {
            return res.status(401).send({ message: 'Nombre de usuario o contraseña incorrectos' });
        }
        // Usuario autenticado, generar token
        const token = jwt.sign({ id: results[0].id }, 'tu_super_secreto', { expiresIn: '8h' });
        res.send({ message: 'Inicio de sesión exitoso', token });
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
