class NovedadesService {
  async registrarIncapacidad(data, archivo) {
    // 1. Validar Dominio Corporativo
    if (!data.email || !data.email.endsWith('@alocredit.co')) {
      throw new Error("Acceso denegado: Correo no corporativo.");
    }

    // 2. Regla de Negocio: Licencia de Paternidad
    // "No se paga por nómina si excede 20 días después del parto"
    if (data.tipo === 'PATERNIDAD') {
      if (!data.fechaParto) throw new Error("Fecha de parto requerida para Paternidad.");
      
      const fechaParto = new Date(data.fechaParto);
      const hoy = new Date();
      // Calculo diferencia en días
      const diasDiferencia = Math.floor((hoy - fechaParto) / (1000 * 60 * 60 * 24));
      
      if (diasDiferencia > 20) {
        throw new Error(`RECHAZADO: Han pasado ${diasDiferencia} días desde el parto. El límite es 20 días.`);
      }
    }

    // 3. Simular Guardado en Base de Datos
    // Aquí conectaríamos con Firebase o Google Sheets
    return {
      id: Date.now(),
      mensaje: `Novedad de ${data.tipo} registrada correctamente.`,
      empleado: data.empleado,
      archivoRecibido: archivo ? archivo.originalname : 'N/A'
    };
  }
}

module.exports = new NovedadesService();