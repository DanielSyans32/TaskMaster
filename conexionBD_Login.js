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
    const { username,email,password } = req.body;
    // Convertir el nombre de usuario a mayúsculas para evitar duplicados insensibles a mayúsculas/minúsculas
    
    const emailUpper=email.toUpperCase();
    
    // Verificar si el usuario ya existe
    db.query('SELECT * FROM users WHERE email = ?', [emailUpper], (error, results) => {
        if (error) {
            return res.status(500).send({ message: 'Error en el servidor' });
        }
        if (results.length > 0) {
            return res.status(409).send('El correo electrónico ya está registrado');
        }
        // Insertar el usuario en la base de datos
        db.query('INSERT INTO users (username, password, email) VALUES (?, ?, ?)', [username, password, emailUpper], (error, results) => {
            if (error) {
                return res.status(500).send({ message: 'Error al registrar el usuario' });
            }
            // Usuario registrado, redirigir al inicio de sesión

            return res.status(200).send({ message: 'Registro exitoso, por favor inicie sesión.' });
            window.location.href = 'login.html'; // Asumiendo que 'login.html' es la página de inicio de sesión
           

        });
    });
});
//Editar usuario
// Editar información del usuario, incluyendo verificación de contraseña actual
app.put('/editarUsuario/:id', (req, res) => {
    const userId = req.params.id;
    const { username, email, newPassword, currentPassword } = req.body;

    // Verificar la contraseña actual antes de permitir la edición
    const verifyPasswordQuery = 'SELECT password FROM users WHERE id = ?';
    db.query(verifyPasswordQuery, [userId], (error, results) => {
        if (error) {
            return res.status(500).json({ success: false, message: 'Error al verificar la contraseña actual', error });
        }

        const storedPassword = results[0].password;
        // Verificar que la contraseña actual proporcionada coincida con la almacenada
        if (currentPassword !== storedPassword) {
            return res.status(401).json({ success: false, message: 'La contraseña actual no es válida' });
        }

        // Verificar si el nuevo correo ya está en uso por otro usuario
        const checkEmailQuery = 'SELECT id FROM users WHERE email = ? AND id != ?';
        db.query(checkEmailQuery, [email, userId], (error, emailResults) => {
            if (error) {
                return res.status(500).json({ success: false, message: 'Error al verificar el correo', error });
            }

            if (emailResults.length > 0) {
                return res.status(400).json({ success: false, message: 'El correo ya está en uso por otro usuario' });
            }

            // Ahora puedes proceder a actualizar la información del usuario, incluida la contraseña
            const updateQuery = 'UPDATE users SET username = ?, email = ?, password = ? WHERE id = ?';
            db.query(updateQuery, [username, email, newPassword, userId], (error, results) => {
                if (error) {
                    return res.status(500).json({ success: false, message: 'Error al editar información del perfil', error });
                }
                res.status(200).json({ success: true, message: 'Información del perfil editada con éxito' });
            });
        });
    });
});


// Ruta de inicio de sesión
// Ruta de inicio de sesión
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const emailUpper = email.toUpperCase(); // Convertir el email a mayúsculas para la comparación
    // Verificar el usuario y la contraseña
    db.query('SELECT * FROM users WHERE UPPER(email) = ?', [emailUpper], (error, results) => {
        if (error) {
            return res.status(500).send({ message: 'Error en el servidor' });
        }
        if (results.length === 0 || password !== results[0].password) {
            return res.status(401).send({ message: 'Email o contraseña incorrectos' });
        }
        // Usuario autenticado, aquí deberías devolver el ID del usuario
        // NOTA: Asegúrate de que 'id' sea el nombre correcto de la propiedad en tus resultados
        res.json({ userId: results[0].id });
    });
});




// Ruta para crear una nueva sección
app.post('/crearSeccion', (req, res) => {
    const { nombre, id_usuario } = req.body; // Asegúrate de que el ID del usuario se obtiene de forma segura, posiblemente a través de una sesión o token
    const name=nombre;
    const user_id=id_usuario
    const query = 'INSERT INTO sections (user_id,name) VALUES (?, ?)';
    db.query(query, [user_id,name], (error, results) => {
        if (error) {
            return res.status(500).send({ message: 'Error al crear la sección', error });
        }
        res.status(200).send({ message: 'Sección creada con éxito', id: results.insertId });
    });
});

// Ruta para obtener las secciones de un usuario
app.get('/obtenerSecciones', (req, res) => {
    const { id_usuario } = req.query; // Asegúrate de que el ID del usuario se obtiene de forma segura
    const query = 'SELECT * FROM sections WHERE user_id = ?';
    db.query(query, [id_usuario], (error, results) => {
        if (error) {
            return res.status(500).send({ message: 'Error al obtener secciones', error });
        }
        res.status(200).send({ secciones: results });
    });
});


//Actualizar nombre de seccion
app.post('/actualizarNombreSeccion', (req, res) => {
    const { id, name } = req.body;
    const query = 'UPDATE sections SET name = ? WHERE id = ?';

    db.query(query, [name, id], (error, results) => {
        if (error) {
            return res.status(500).json({ success: false, message: 'Error al actualizar el nombre de la sección', error });
        }
        res.json({ success: true, message: 'Nombre de la sección actualizado' });
    });
});

//Eliminar seccion seleccionada
// Endpoint para eliminar sección y sus subsecciones
app.delete('/eliminarSeccion/:id', (req, res) => {
    const sectionId = req.params.id;

    // Inicia una transacción para garantizar la consistencia de los datos
    db.beginTransaction((err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error de transacción', error: err });
        }

        // Elimina las subsecciones asociadas a la sección
        db.query('DELETE FROM subsections WHERE section_id = ?', [sectionId], (error, results) => {
            if (error) {
                return db.rollback(() => {
                    res.status(500).json({ success: false, message: 'Error al eliminar subsecciones', error });
                });
            }

            // Elimina la sección
            db.query('DELETE FROM sections WHERE id = ?', [sectionId], (error, results) => {
                if (error) {
                    return db.rollback(() => {
                        res.status(500).json({ success: false, message: 'Error al eliminar sección', error });
                    });
                }

                // Commit la transacción si todas las consultas son exitosas
                db.commit((err) => {
                    if (err) {
                        return db.rollback(() => {
                            res.status(500).json({ success: false, message: 'Error al hacer commit de la transacción', error: err });
                        });
                    }

                    res.status(200).json({ success: true, message: 'Sección y subsecciones eliminadas con éxito' });
                });
            });
        });
    });
});

  

// Añadir rutas similares para subsecciones...
// Ruta para crear una nueva subsección
app.post('/crearSubseccion', (req, res) => {
    const { nombre, id_seccion } = req.body; // Obtén el nombre de la subsección y el ID de la sección a la que pertenece
    const query = 'INSERT INTO subsections (section_id,name) VALUES (?, ?)';
    db.query(query, [id_seccion, nombre], (error, results) => {
        if (error) {
            console.error('Error al crear la subsección: ', error);
            res.status(500).json({ success: false, message: 'Error al crear la subsección' });
          } else {
            res.status(200).json({ success: true, message: 'Subsección creada con éxito', id: results.insertId });
          }
    });
});

// Ruta para obtener las subsecciones de una sección

app.get('/obtenerSubsecciones', (req, res) => {
    const id_seccion = req.query.id_seccion; // Asegúrate de obtener el parámetro correctamente
    const query = 'SELECT * FROM subsections WHERE section_id = ?';
    db.query(query, [id_seccion], (error, results) => {
        if (error) {
            return res.status(500).send({ message: 'Error al obtener subsecciones', error });
        }
        res.status(200).send({ subsecciones: results });
    });
});



// Ejemplo de cómo podrías manejar la eliminación de una subsección
app.delete('/eliminarSubseccion/:id', (req, res) => {
    const subsecId = req.params.id;

    // Inicia una transacción para garantizar la consistencia de los datos
    db.beginTransaction((err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error de transacción', error: err });
        }

        // Elimina las notas asociadas a la subsección
        db.query('DELETE FROM notas WHERE subsection_id = ?', [subsecId], (error, results) => {
            if (error) {
                return db.rollback(() => {
                    res.status(500).json({ success: false, message: 'Error al eliminar notas', error });
                });
            }

            // Ahora que las notas se han eliminado, eliminamos la subsección
            db.query('DELETE FROM subsections WHERE id = ?', [subsecId], (error, results) => {
                if (error) {
                    return db.rollback(() => {
                        res.status(500).json({ success: false, message: 'Error al eliminar subsección', error });
                    });
                }

                // Commit la transacción si todas las consultas son exitosas
                db.commit((err) => {
                    if (err) {
                        return db.rollback(() => {
                            res.status(500).json({ success: false, message: 'Error al hacer commit de la transacción', error: err });
                        });
                    }

                    res.status(200).json({ success: true, message: 'Subsección y notas eliminadas con éxito' });
                });
            });
        });
    });
});


//Editar subsecciones
// En conexionBD_Login.js

app.post('/actualizarSubseccion', (req, res) => {
    const { id, nombre } = req.body;
    // Asegúrate de que la consulta SQL esté bien formada y sea segura
    const query = 'UPDATE subsections SET name = ? WHERE id = ?';
    db.query(query, [nombre, id], (error, results) => {
        if (error) {
            res.status(500).json({ success: false, message: 'Error al actualizar subsección', error });
        } else {
            res.json({ success: true, message: 'Subsección actualizada correctamente' });
        }
    });
});

//Informacion de perfil
// Este es un ejemplo usando Express.js
app.get('/informacionUsuario', (req, res) => {
    const userId = req.query.id; // O podrías obtenerlo de una sesión o un token

    const query = 'SELECT * FROM users WHERE id = ?';
    db.query(query, [userId], (error, results) => {
        if (error) {
            return res.status(500).send({ message: 'Error al obtener informacion perfil', error });
        }
        res.status(200).send({ perfilInformacion: results });
    });
});

app.get('/informacionUsuario2/:id', (req, res) => {
    const userId = req.params.id;

    const query = 'SELECT username, email FROM users WHERE id = ?';
    db.query(query, [userId], (error, results) => {
        if (error) {
            return res.status(500).json({ success: false, message: 'Error al obtener la información del usuario', error });
        }

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }

        const perfilInformacion = {
            username: results[0].username,
            email: results[0].email,
        };

        res.status(200).json({ success: true, perfilInformacion });
    });
});

//Ingresar datos de las notas
// Ruta para crear una nueva sección
app.post('/crearNota', (req, res) => {
    const { nombre, nota, fecha, descripcion, subsection_id } = req.body;
  
    // Imprimir el cuerpo de la solicitud en la consola
    console.log('Cuerpo de la solicitud:', req.body);
  
    const query = 'INSERT INTO notas (subsection_id, nombre, nota, fecha, descripcion) VALUES (?, ?, ?, ?, ?)';
    db.query(query, [subsection_id, nombre, nota, fecha, descripcion], (error, results) => {
      if (error) {
        console.error('Error SQL:', error.sqlMessage); // Muestra el mensaje de error SQL
        return res.status(500).send({ success: false, message: 'Error al crear la nota', error: error.sqlMessage });
      }
      res.status(200).send({ success: true, message: 'Nota creada con éxito', id: results.insertId });
    });
  });
  
//cargar notas
app.get('/obtenerNotas', (req, res) => {
    const id_seccion = req.query.id_seccion; // Asegúrate de obtener el parámetro correctamente
    const query = 'SELECT * FROM notas WHERE subsection_id = ?';
    db.query(query, [id_seccion], (error, results) => {
        if (error) {
            return res.status(500).send({ message: 'Error al obtener subsecciones', error });
        }
        res.status(200).send({ notas: results });
    });
});

app.get('/obtenerNotasDetalles', (req, res) => {
    const id_nota = req.query.id_nota; // Asegúrate de obtener el parámetro correctamente
    const query = 'SELECT * FROM notas WHERE id = ?';
    db.query(query, [id_nota], (error, results) => {
        if (error) {
            return res.status(500).send({ message: 'Error al obtener subsecciones', error });
        }
        res.status(200).send({ notas: results });
    });
});

// Agrega esta ruta para manejar la eliminación de notas
app.delete('/eliminarNota/:id_nota', (req, res) => {
    const idNota = req.params.id_nota; // Obtén el parámetro desde la URL
    const query = 'DELETE FROM notas WHERE id = ?';

    db.query(query, [idNota], (error, results) => {
        if (error) {
            return res.status(500).send({ success: false, message: 'Error al eliminar la nota', error });
        }

        // Comprueba si se eliminó alguna fila (si existía una nota con ese ID)
        const success = results.affectedRows > 0;

        res.status(200).send({ success, message: 'Nota eliminada correctamente' });
    });
});

app.put('/EditarNota/:idNota', (req, res) => {
    const idNota = req.params.idNota;
    const { nombre, nota, fecha, descripcion } = req.body;

    const query = 'UPDATE notas SET nombre = ?, nota = ?, fecha = ?, descripcion = ? WHERE id = ?';
    db.query(query, [nombre, nota, fecha, descripcion, idNota], (error, results) => {
        if (error) {
            console.error('Error SQL:', error.sqlMessage);
            return res.status(500).send({ success: false, message: 'Error al editar la nota', error: error.sqlMessage });
        }
        res.status(200).send({ success: true, message: 'Nota editada con éxito' });
    });
});

// cargar amigo
// Endpoint para agregar un amigo
app.post('/agregarAmigo', (req, res) => {
    const { idUser, correo } = req.body;
  
    // Convertir el correo a mayúsculas
    const correoMayusculas = correo.toUpperCase();
  
    // Buscar el usuario por correo en la base de datos (en mayúsculas)
    const queryBuscarUsuario = 'SELECT id FROM users WHERE UPPER(email) = ?';
    db.query(queryBuscarUsuario, [correoMayusculas], (error, resultsUsuario) => {
      if (error) {
        return res.status(500).send({ success: false, message: 'Error al buscar el usuario', error });
      }
  
      // Verificar si se encontró un usuario con el correo proporcionado
      if (resultsUsuario.length > 0) {
        const friend_id = resultsUsuario[0].id;
  
        // Insertar la relación de amistad en la tabla 'friends'
        const queryAgregarAmigo = 'INSERT INTO friends (user_id, friend_id) VALUES (?, ?)';
        db.query(queryAgregarAmigo, [idUser, friend_id], (errorAgregarAmigo) => {
          if (errorAgregarAmigo) {
            return res.status(500).send({ success: false, message: 'Error al agregar el amigo', error: errorAgregarAmigo });
          }
  
          res.status(200).send({ success: true, message: 'Amigo agregado con éxito' });
        });
      } else {
        res.status(404).send({ success: false, message: 'Correo no encontrado en la base de datos' });
      }
    });
  });


  //Cargar amigos

// Endpoint para obtener amigos
app.get('/obtenerAmigos/:id_user', (req, res) => {
    const idUser = req.params.id_user;

    // Consulta SQL para obtener amigos del usuario
    const query = `
        SELECT users.id, users.email
        FROM friends
        INNER JOIN users ON friends.friend_id = users.id
        WHERE friends.user_id = ?
    `;

    // Ejecutar la consulta SQL
    db.query(query, [idUser], (error, results) => {
        if (error) {
            console.error('Error al obtener amigos:', error);
            return res.status(500).json({ error: 'Error al obtener amigos' });
        }

        const amigos = results.map(amigo => ({ id: amigo.id, email: amigo.email }));
        res.status(200).json({ amigos });
    });
});

//Eliminar amigo de mi lista de amigos
// Endpoint para eliminar amigo
app.delete('/eliminarAmigo/:id_user/:friend_id', (req, res) => {
    const userId = req.params.id_user;
    const friendId = req.params.friend_id;

    // Asumiendo que tienes una conexión a la base de datos llamada 'db'
    db.query('DELETE FROM friends WHERE user_id = ? AND friend_id = ?', [userId, friendId], (error, results) => {
        if (error) {
            return res.status(500).send({ success: false, message: 'Error al eliminar amigo', error });
        }

        // Verifica si se eliminó algún registro
        if (results.affectedRows > 0) {
            res.status(200).json({ success: true, message: 'Amigo eliminado con éxito' });
        } else {
            res.status(404).json({ success: false, message: 'No se encontró la relación de amigo para eliminar' });
        }
    });
});

//Eliminar usuario de la base de datos:
// Endpoint para eliminar usuario y referencias
app.delete('/eliminarUsuario/:id', (req, res) => {
    const userId = req.params.id;

    // Inicia una transacción para garantizar la consistencia de los datos
    db.beginTransaction((err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error de transacción', error: err });
        }

        // Elimina las notas asociadas al usuario
        db.query('DELETE FROM notas WHERE subsection_id IN (SELECT id FROM subsections WHERE section_id IN (SELECT id FROM sections WHERE user_id = ?))', [userId], (error, results) => {
            if (error) {
                return db.rollback(() => {
                    res.status(500).json({ success: false, message: 'Error al eliminar notas', error });
                });
            }

            // Elimina las secciones asociadas al usuario
            db.query('DELETE FROM sections WHERE user_id = ?', [userId], (error, results) => {
                if (error) {
                    return db.rollback(() => {
                        res.status(500).json({ success: false, message: 'Error al eliminar secciones', error });
                    });
                }

                // Elimina las subsecciones asociadas al usuario
                db.query('DELETE FROM subsections WHERE section_id IN (SELECT id FROM sections WHERE user_id = ?)', [userId], (error, results) => {
                    if (error) {
                        return db.rollback(() => {
                            res.status(500).json({ success: false, message: 'Error al eliminar subsecciones', error });
                        });
                    }

                    // Elimina las relaciones de amigos del usuario
                    db.query('DELETE FROM friends WHERE user_id = ? OR friend_id = ?', [userId, userId], (error, results) => {
                        if (error) {
                            return db.rollback(() => {
                                res.status(500).json({ success: false, message: 'Error al eliminar relaciones de amigos', error });
                            });
                        }

                        // Finalmente, elimina al usuario de la tabla 'users'
                        db.query('DELETE FROM users WHERE id = ?', [userId], (error, results) => {
                            if (error) {
                                return db.rollback(() => {
                                    res.status(500).json({ success: false, message: 'Error al eliminar usuario', error });
                                });
                            }

                            // Commit la transacción si todas las consultas son exitosas
                            db.commit((err) => {
                                if (err) {
                                    return db.rollback(() => {
                                        res.status(500).json({ success: false, message: 'Error al hacer commit de la transacción', error: err });
                                    });
                                }

                                res.status(200).json({ success: true, message: 'Usuario y referencias eliminados con éxito' });
                            });
                        });
                    });
                });
            });
        });
    });
});




// No olvides configurar el middleware para parsear el cuerpo de las solicitudes en formato JSON
app.use(express.json());


const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
