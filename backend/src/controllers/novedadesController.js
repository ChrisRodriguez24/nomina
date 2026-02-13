const novedadesService = require('../services/novedadesService');

exports.crear = async (req, res) => {
  try {
    // req.body contiene los campos de texto
    // req.file contiene el archivo PDF
    if (!req.file && req.body.tipo !== 'VACACIONES') {
       // Ejemplo: Exigir soporte salvo vacaciones
    }

    const resultado = await novedadesService.registrarIncapacidad(req.body, req.file);
    res.status(200).json({ success: true, data: resultado });
  } catch (error) {
    console.error("Error:", error.message);
    res.status(400).json({ success: false, error: error.message });
  }
};