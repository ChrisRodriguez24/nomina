const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const novedadesController = require('./controllers/novedadesController');

const app = express();

// Configuración de Carga de Archivos (Max 2MB)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, 
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Solo se permiten archivos PDF'));
  }
});

// Middlewares
app.use(cors());
app.use(express.json());

// Ruta de prueba
app.get('/', (req, res) => res.send('API Aló Credit Online 🚀'));

// Ruta Principal de Novedades
app.post('/api/novedades', upload.single('soporte'), novedadesController.crear);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend corriendo en puerto ${PORT}`));