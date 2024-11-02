const express = require("express");
const mysql = require("mysql");
const bodyParser = require("body-parser");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Configuración de almacenamiento para multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "uploads");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath);
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

// Configuración de la base de datos
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

// Probar conexión con la base de datos
pool.getConnection((err, connection) => {
  if (err) {
    console.error("Error connecting to the database:", err);
    return;
  }
  if (connection) connection.release();
  console.log("Connected to the database");
});

// Middleware para agregar conexión de base de datos a cada request
app.use((req, res, next) => {
  req.db = pool;
  next();
});

// Ruta para login de administrador
app.post("/api/login", (req, res) => {
  const { nombre, password } = req.body;

  if (!nombre || !password) {
    return res
      .status(400)
      .json({ message: "Nombre y password son requeridos." });
  }

  const sql = "SELECT * FROM administrador WHERE nombre = ? AND password = ?";
  req.db.query(sql, [nombre, password], (err, results) => {
    if (err) {
      console.error("Error querying administrador table:", err);
      return res.status(500).json({ message: "Error en el servidor" });
    }

    if (results.length > 0) {
      res.status(200).json({ message: "Login exitoso", admin: results[0] });
    } else {
      res.status(401).json({ message: "Credenciales incorrectas" });
    }
  });
});

// Ruta para obtener todos los administradores
app.get("/api/administrador", (req, res) => {
  const sql = "SELECT * FROM administrador";
  req.db.query(sql, (err, results) => {
    if (err) {
      console.error("Error querying administrador table:", err);
      return res
        .status(500)
        .json({ message: "Error al obtener administradores" });
    }
    res.status(200).json(results);
  });
});

// Ruta para obtener todos los neumáticos
app.get("/api/neumaticos", (req, res) => {
  const sql = "SELECT * FROM neumaticos";
  req.db.query(sql, (err, results) => {
    if (err) {
      console.error("Error querying neumaticos table:", err);
      return res.status(500).json({ message: "Error al obtener neumáticos" });
    }
    results.forEach((neumatico) => {
      if (neumatico.imagen) {
        neumatico.imagen = `http://localhost:${port}/uploads/${neumatico.imagen}`;
      }
    });
    res.status(200).json(results);
  });
});

// Ruta para obtener un neumático por su ID
app.get("/api/neumaticos/:id", (req, res) => {
  const { id } = req.params;
  const sql = "SELECT * FROM neumaticos WHERE id = ?";
  req.db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("Error querying neumaticos table:", err);
      return res.status(500).json({ message: "Error al obtener el neumático" });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: "Neumático no encontrado" });
    }
    if (results[0].imagen) {
      results[0].imagen = `http://localhost:${port}/uploads/${results[0].imagen}`;
    }
    res.status(200).json(results[0]);
  });
});

// Ruta para agregar un neumático con imagen
app.post("/api/neumaticos", upload.single("imagen"), (req, res) => {
  const { marca, modelo, alto, ancho, pulgada, cantidad, precio, condicion } =
    req.body;
  const imagen = req.file ? req.file.filename : null;

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
    return res
      .status(400)
      .json({ message: "Todos los campos son obligatorios" });
  }

  const sql =
    "INSERT INTO neumaticos (marca, modelo, alto, ancho, pulgada, cantidad, precio, condicion, imagen) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
  req.db.query(
    sql,
    [marca, modelo, alto, ancho, pulgada, cantidad, precio, condicion, imagen],
    (err, result) => {
      if (err) {
        console.error("Error al agregar el neumático:", err);
        return res
          .status(500)
          .json({ message: "Error al agregar el neumático" });
      }
      res.status(201).json({
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
        return res
          .status(500)
          .json({ message: "Error al actualizar el neumático" });
      }
      res.status(200).json({ message: "Neumático actualizado exitosamente" });
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
      return res
        .status(500)
        .json({ message: "Error al eliminar el neumático" });
    }
    res.status(200).json({ message: "Neumático eliminado exitosamente" });
  });
});

// Servir archivos estáticos en la carpeta "uploads" para acceder a las imágenes
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.listen(port, () => {
  console.log(`API listening at http://localhost:${port}`);
});
