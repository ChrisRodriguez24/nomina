const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { syncDatabase } = require('./syncSheets');
const { uploadFileToDrive } = require('./googleDrive');

const app = express();
app.use(cors());
app.use(express.json());

const FOLDER_MAPPING = {
    'GENERAL': 'Incapacidades Médicas',
    'LICENCIA_LUTO': 'Licencias de Luto',
    'CALAMIDAD_DOMESTICA': 'Calamidades Domésticas',
    'LICENCIA_NO_REMUNERADA': 'Licencias No Remuneradas',
    'DIA_FAMILIA': 'Días de la Familia',
    'PERMISO_REMUNERADO': 'Permisos Remunerados',
    'VACACIONES': 'Vacaciones',
    'MATERNIDAD': 'Licencia Maternidad',
    'PATERNIDAD': 'Licencia Paternidad',
    'LABORAL': 'Accidentes Laborales',
    'TRANSITO': 'Accidentes de Tránsito'
};

// CONFIGURACIÓN MULTER (ARCHIVOS)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './uploads';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + unique + path.extname(file.originalname));
    }
});
const upload = multer({
    storage: storage,
    limits: { fileSize: 1024 * 1024 }, // 1MB
    fileFilter: (req, f, cb) => f.mimetype === 'application/pdf' ? cb(null, true) : cb(new Error('Solo PDF'))
});

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// 1. CONFIGURACIÓN
app.get('/api/config', async (req, res) => {
    try { const r = await pool.query("SELECT * FROM configuracion_conceptos ORDER BY codigo"); res.json(r.rows); }
    catch (e) { res.status(500).json(e); }
});
app.put('/api/config', async (req, res) => {
    try {
        await pool.query("UPDATE configuracion_conceptos SET porcentaje=$1, descripcion=$2 WHERE codigo=$3", [req.body.porcentaje, req.body.descripcion, req.body.codigo]);
        res.json({ success: true });
    }
    catch (e) { res.status(500).json(e); }
});

// 2. EMPLEADO
app.get('/api/empleados/:cedula', async (req, res) => {
    try {
        const { cedula } = req.params;
        const result = await pool.query(`
            SELECT p.nombre_completo, c.id as contrato_id, c.salario 
            FROM personas p 
            JOIN contratos c ON c.persona_id = p.id 
            WHERE p.documento = $1 AND c.estado = 'ACTIVO'
        `, [cedula]);
        if (result.rows.length > 0) res.json(result.rows[0]);
        else res.status(404).json({ error: 'Empleado no encontrado' });
    } catch (e) { res.status(500).json(e); }
});

// 3. GUARDAR NÓMINA (JSON)
app.post('/api/nomina', async (req, res) => {
    try {
        const d = req.body;
        await pool.query(`INSERT INTO novedades (contrato_id, tipo_registro, concepto_codigo, concepto_nombre, cantidad, valor, unidad, fecha_novedad) VALUES ($1,'NOMINA',$2,$3,$4,$5,$6,$7)`,
            [d.contratoId, d.concepto, d.conceptoNombre, d.cantidad, d.valor, d.unidad, d.fecha]);
        res.json({ success: true });
    } catch (e) { res.status(500).json(e); }
});

app.post('/api/radicar', upload.any(), async (req, res) => {
    try {
        const { contratoId, tipo, fechaInicio, dias, cie10, cie10Desc } = req.body;

        // 1. Obtener Nombre del Empleado
        const empRes = await pool.query(`SELECT p.nombre_completo FROM personas p JOIN contratos c ON c.persona_id = p.id WHERE c.id = $1`, [contratoId]);
        const nombreEmpleado = empRes.rows.length > 0 ? empRes.rows[0].nombre_completo : 'Empleado_Desconocido';

        // 2. Formatear fechas
        const d = new Date(fechaInicio + 'T12:00:00'); // Evitar desfase
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const dateStr = `${day}${month}${year}`;

        // Friendly folder name
        const friendlyTipo = FOLDER_MAPPING[tipo] || tipo;

        const archivos = {};

        // 3. Subir archivos a Google Drive con estructura solicitada
        for (const f of req.files) {
            const driveName = `${dateStr}-${f.fieldname.toUpperCase()}.pdf`;
            const driveFile = await uploadFileToDrive({
                filePath: f.path,
                fileName: driveName,
                folders: [friendlyTipo, nombreEmpleado, dateStr]
            });
            archivos[f.fieldname] = driveFile.id;

            // Limpieza local
            try { fs.unlinkSync(f.path); } catch (e) { console.error("Error unlinking:", e); }
        }

        // 4. Calc Fin
        const ini = new Date(fechaInicio);
        const fin = new Date(ini);
        fin.setDate(fin.getDate() + parseInt(dias) - 1);

        await pool.query(`INSERT INTO novedades (contrato_id, tipo_registro, tipo_incapacidad, fecha_novedad, dias, fecha_fin, cie10_codigo, cie10_descripcion, archivos_adjuntos) VALUES ($1, 'INCAPACIDAD', $2, $3, $4, $5, $6, $7, $8)`,
            [contratoId, tipo, fechaInicio, dias, fin, cie10, cie10Desc, JSON.stringify(archivos)]);

        res.json({ success: true });
    } catch (e) {
        console.error("Error en radicar:", e);
        res.status(500).json({ error: e.message });
    }
});

// 5. REPORTES DASHBOARD
app.get('/api/reportes', async (req, res) => {
    try {
        const client = await pool.connect();
        try {

            const { year, month } = req.query;
            let dateFilter = "";
            let params = [];

            // Default to current month if not provided, or handle range
            if (year && month) {
                dateFilter = "AND TO_CHAR(fecha_novedad, 'YYYY-MM') = $1";
                params.push(`${year}-${month.padStart(2, '0')}`);
            }

            // A. Recargos & Variables (Por Concepto)
            const recargosRes = await client.query(`SELECT concepto_codigo as name, SUM(valor) as value FROM novedades WHERE tipo_registro = 'NOMINA' ${dateFilter} GROUP BY concepto_codigo`, params);

            // B. Recargos & Variables (Tendencia 6 meses) - Unaffected by single month filter, keeps history
            const historyRes = await client.query(`SELECT TO_CHAR(fecha_novedad, 'YYYY-MM') as month, SUM(valor) as total FROM novedades WHERE tipo_registro = 'NOMINA' GROUP BY month ORDER BY month DESC LIMIT 6`);

            // C. Incapacidades por Tipo
            const incTypeRes = await client.query(`SELECT tipo_incapacidad as name, SUM(dias) as value FROM novedades WHERE tipo_registro = 'INCAPACIDAD' ${dateFilter} GROUP BY tipo_incapacidad`, params);

            // D. Top Offenders (Personas con más días)
            const topOffendersRes = await client.query(`SELECT p.nombre_completo as name, SUM(n.dias) as dias FROM novedades n JOIN contratos c ON n.contrato_id = c.id JOIN personas p ON c.persona_id = p.id WHERE n.tipo_registro = 'INCAPACIDAD' ${dateFilter} GROUP BY p.nombre_completo ORDER BY dias DESC LIMIT 5`, params);

            // F. Ausentismo (KPI)
            // 1. Get Total Employees per Area
            const empPerAreaRes = await client.query(`SELECT a.nombre as area, COUNT(*) as total_emp FROM contratos c JOIN areas a ON c.area_id = a.id WHERE c.estado = 'ACTIVO' GROUP BY a.nombre`);
            // 2. Get Sick Days per Area
            const sickPerAreaRes = await client.query(`SELECT a.nombre as area, SUM(n.dias) as dias FROM novedades n JOIN contratos c ON n.contrato_id = c.id JOIN areas a ON c.area_id = a.id WHERE n.tipo_registro = 'INCAPACIDAD' ${dateFilter} GROUP BY a.nombre`, params);

            // Merge to calculate rate: (SickDays / (Emps * 30)) * 100
            const absenteeismData = empPerAreaRes.rows.map(area => {
                const sickData = sickPerAreaRes.rows.find(s => s.area === area.area);
                const days = sickData ? parseFloat(sickData.dias || 0) : 0;
                const totalDaysPotential = parseInt(area.total_emp) * 30; // Assuming 30 days month
                const rate = totalDaysPotential > 0 ? ((days / totalDaysPotential) * 100).toFixed(2) : 0;
                return {
                    area: area.area,
                    rate: parseFloat(rate),
                    dias: days,
                    headcount: parseInt(area.total_emp)
                };
            }).sort((a, b) => b.rate - a.rate);

            res.json({
                recargos: {
                    byConcept: recargosRes.rows,
                    history: historyRes.rows.reverse()
                },
                incapacidades: {
                    byType: incTypeRes.rows,
                    topOffenders: topOffendersRes.rows,
                    absenteeism: absenteeismData
                }
            });
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: e.message });
        } finally {
            client.release();
        }

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// 6. SYNC
app.post('/api/sync-sheets', async (req, res) => {
    try { const r = await syncDatabase(pool, process.env.SHEET_ID); res.json({ message: "Sync OK", details: r }); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

const { generatePayrollReport } = require('./excelExport');

// 7. EXPORTAR NÓMINA (EXCEL)
app.get('/api/nomina/export', async (req, res) => {
    try {
        const { start, end } = req.query;
        if (!start || !end) return res.status(400).json({ error: 'Fechas requeridas (start, end)' });

        const client = await pool.connect();
        try {
            const workbook = await generatePayrollReport(client, start, end);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=Nomina_${start}_${end}.xlsx`);
            await workbook.xlsx.write(res);
            res.end();
        } finally {
            client.release();
        }
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.listen(3000, () => console.log('🚀 API Ready'));