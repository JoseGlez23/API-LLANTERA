const express = require("express");
const mysql = require("mysql");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

const dbConfig = {
  host: "127.0.0.1",
  user: "root",
  password: "",
  database: "llanteria",
  connectTimeout: 10000,
  acquireTimeout: 10000,
  connectionLimit: 10,
  queueLimit: 0,
};

const pool = mysql.createPool(dbConfig);

pool.getConnection((err, connection) => {
  if (err) {
    console.error("Error connecting to the database:", err);
    return;
  }
  if (connection) connection.release();
  console.log("Connected to the database");
});

app.use((req, res, next) => {
  req.db = pool;
  next();
});

pool.on("error", function (err) {
  console.error("Database error:", err);
  if (err.code === "PROTOCOL_CONNECTION_LOST") {
    handleDisconnect();
  } else {
    throw err;
  }
});

function handleDisconnect() {
  pool.getConnection((err, connection) => {
    if (err) {
      console.error("Error when connecting to db:", err);
      setTimeout(handleDisconnect, 2000);
    }
    if (connection) connection.release();
    console.log("Reconnected to the database");
  });
}

// Ruta para login de administrador
app.post("/api/login", (req, res) => {
  const { nombre, password } = req.body;

  if (!nombre || !password) {
    return res.status(400).send("Nombre y password son requeridos.");
  }

  const sql = "SELECT * FROM administrador WHERE nombre = ? AND password = ?";
  req.db.query(sql, [nombre, password], (err, results) => {
    if (err) {
      console.error("Error querying administrador table:", err);
      return res.status(500).send("Error en el servidor: " + err.message);
    }

    if (results.length > 0) {
      res.status(200).send({ message: "Login exitoso", admin: results[0] });
    } else {
      res.status(401).send("Credenciales incorrectas");
    }
  });
});

// Ruta para obtener todos los administradores
app.get("/api/administrador", (req, res) => {
  const sql = "SELECT * FROM administrador";
  req.db.query(sql, (err, results) => {
    if (err) {
      console.error("Error querying administrador table:", err);
      return res.status(500).send("Error al obtener administradores: " + err.message);
    }
    res.status(200).send(results);
  });
});

// Ruta para obtener un administrador por su ID
app.get("/api/administrador/:id", (req, res) => {
  const { id } = req.params;
  const sql = "SELECT * FROM administrador WHERE id = ?";
  req.db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("Error al obtener el administrador:", err);
      return res.status(500).send("Error al obtener el administrador: " + err.message);
    }
    if (results.length === 0) {
      return res.status(404).send("Administrador no encontrado.");
    }
    res.status(200).send(results[0]);
  });
});

// Ruta para obtener todos los neumáticos
app.get("/api/neumaticos", (req, res) => {
  const sql = "SELECT * FROM neumaticos";
  req.db.query(sql, (err, results) => {
    if (err) {
      console.error("Error querying neumaticos table:", err);
      return res.status(500).send("Error querying neumaticos table: " + err.message);
    }
    res.status(200).send(results);
  });
});

// Ruta para obtener un neumático por su ID
app.get("/api/neumaticos/:id", (req, res) => {
  const { id } = req.params;
  const sql = "SELECT * FROM neumaticos WHERE id = ?";
  req.db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("Error querying neumaticos table:", err);
      return res.status(500).send("Error al obtener el neumático: " + err.message);
    }
    if (results.length === 0) {
      return res.status(404).send("Neumático no encontrado.");
    }
    res.status(200).send(results[0]);
  });
});

// Ruta para agregar un neumático
app.post("/api/neumaticos", (req, res) => {
  const {
    marca,
    modelo,
    alto,
    ancho,
    pulgada,
    cantidad,
    precio,
    condicion,
    imagen,
  } = req.body;

  if (
    !marca ||
    !modelo ||
    alto === undefined ||
    ancho === undefined ||
    pulgada === undefined ||
    cantidad === undefined ||
    precio === undefined ||
    !condicion
  ) {
    return res.status(400).send("Todos los campos son obligatorios.");
  }

  const sql =
    "INSERT INTO neumaticos (marca, modelo, alto, ancho, pulgada, cantidad, precio, condicion, imagen) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";

  req.db.query(
    sql,
    [marca, modelo, alto, ancho, pulgada, cantidad, precio, condicion, imagen],
    (err, result) => {
      if (err) {
        console.error("Error al agregar el neumático:", err);
        return res.status(500).send("Error al agregar el neumático: " + err.message);
      }
      res.status(201).send({
        message: "Neumático agregado exitosamente",
        id: result.insertId,
      });
    }
  );
});

// Ruta para actualizar un neumático
app.put("/api/neumaticos/:id", (req, res) => {
  const { id } = req.params;
  const {
    marca,
    modelo,
    alto,
    ancho,
    pulgada,
    cantidad,
    precio,
    condicion,
    imagen,
  } = req.body;

  if (cantidad < 0) {
    return res.status(400).send("La cantidad no puede ser negativa.");
  }

  const sql =
    "UPDATE neumaticos SET marca = ?, modelo = ?, alto = ?, ancho = ?, pulgada = ?, cantidad = ?, precio = ?, condicion = ?, imagen = ? WHERE id = ?";
  req.db.query(
    sql,
    [
      marca,
      modelo,
      alto,
      ancho,
      pulgada,
      cantidad,
      precio,
      condicion,
      imagen,
      id,
    ],
    (err, result) => {
      if (err) {
        console.error("Error updating neumaticos:", err);
        return res.status(500).send("Error updating neumaticos: " + err.message);
      }
      res.status(200).send(result);
    }
  );
});

// Ruta para eliminar un neumático
app.delete("/api/neumaticos/:id", (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM neumaticos WHERE id = ?";
  req.db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Error al eliminar el neumático:", err);
      return res.status(500).send("Error al eliminar el neumático: " + err.message);
    }
    res.status(200).send({ message: "Neumático eliminado exitosamente" });
  });
});

app.listen(port, () => {
  console.log(`API listening at http://localhost:${port}`);
});
