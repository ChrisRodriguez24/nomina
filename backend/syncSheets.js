const { Pool } = require('pg');
const { google } = require('googleapis');
const path = require('path');

const clean = (text) => text ? text.toString().trim().toUpperCase() : null;

// Helper para fechas de Excel
const parseDate = (dateVal) => {
    if (!dateVal) return null;
    if (typeof dateVal === 'number') {
        const date = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
        return date.toISOString().split('T')[0];
    }
    const dateStr = dateVal.toString().trim();
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
};

const getAuthClient = async () => {
    const auth = new google.auth.GoogleAuth({
        keyFile: path.join(__dirname, 'google-credentials.json'),
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    return auth.getClient();
};

const fetchSheetData = async (sheets, spreadsheetId, rangeName) => {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: rangeName, valueRenderOption: 'UNFORMATTED_VALUE' });
    const rows = res.data.values;
    if (!rows || rows.length === 0) return [];
    const headers = rows[0].map(h => h.toString().trim());
    return rows.slice(1).map(row => {
        let obj = {};
        headers.forEach((h, i) => obj[h] = row[i]);
        return obj;
    });
};

async function syncDatabase(pool, sheetId) {
    const client = await pool.connect();
    try {
        console.log("🔐 Autenticando...");
        const authClient = await getAuthClient();
        const sheets = google.sheets({ version: 'v4', auth: authClient });

        await client.query('BEGIN');

        // 1. INGRESO COLOMBIA
        console.log("📥 Procesando Ingresos...");
        const datosIngreso = await fetchSheetData(sheets, sheetId, 'Ingreso Colombia!A:AZ');

        // Función Catálogos
        const getCatalogoId = async (tabla, valor, tipo = null) => {
            if (!valor) return null;
            const val = clean(valor);
            let qCheck = `SELECT id FROM ${tabla} WHERE nombre = $1`;
            let qInsert = `INSERT INTO ${tabla} (nombre) VALUES ($1) RETURNING id`;
            if (tabla === 'entidades') {
                qCheck = 'SELECT id FROM entidades WHERE nombre = $1 AND tipo = $2';
                qInsert = 'INSERT INTO entidades (nombre, tipo) VALUES ($1, $2) RETURNING id';
                const res = await client.query(qCheck, [val, tipo]);
                return res.rows.length > 0 ? res.rows[0].id : (await client.query(qInsert, [val, tipo])).rows[0].id;
            }
            const res = await client.query(qCheck, [val]);
            return res.rows.length > 0 ? res.rows[0].id : (await client.query(qInsert, [val])).rows[0].id;
        };

        for (const row of datosIngreso) {
            const documento = clean(row['Documento de identidad'] || row['Cedula']);
            if (!documento) continue;

            const personaId = (await client.query(`
                INSERT INTO personas (
                    documento, tipo_documento, primer_apellido, segundo_apellido, primer_nombre, segundo_nombre, nombre_completo, 
                    fecha_nacimiento, genero, rh, estado_civil, direccion_residencia, ciudad_residencia, celular, correo_personal, contacto_emergencia, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
                ON CONFLICT (documento) DO UPDATE SET nombre_completo = EXCLUDED.nombre_completo, updated_at = NOW() RETURNING id
            `, [
                documento, clean(row['Tipo Doc. ']), clean(row['Primer Apellido']), clean(row['Segundo Apellido']), clean(row['Primer Nombre']), clean(row['Segundo Nombre']), clean(row['Apellidos y Nombres']),
                parseDate(row['Fecha de nacimiento']), clean(row['Genero']), clean(row['RH']), clean(row['Estado Civil']), clean(row['Direccion']), clean(row['Ciudad']),
                clean(row['celular personal']), row['correo personal'], clean(row['Contacto en caso de emergencia'])
            ])).rows[0].id;

            const fechaInicio = parseDate(row['Fecha de inicio']);
            if (!fechaInicio) continue;

            const cargoId = await getCatalogoId('cargos', row['Cargo contratado']);
            const areaId = await getCatalogoId('areas', row['Area']);
            const zonaId = await getCatalogoId('zonas', row['Zona']);
            const bancoId = await getCatalogoId('bancos', row['Banco']);

            // BUSCAR SALARIO EN COLUMNAS POSIBLES
            const salario = Number(row['Salario'] || row['Sueldo'] || row['Basico'] || 0);

            const check = await client.query("SELECT id FROM contratos WHERE persona_id = $1 AND estado = 'ACTIVO'", [personaId]);
            if (check.rows.length === 0) {
                await client.query(`
                    INSERT INTO contratos (persona_id, fecha_inicio, fecha_fin_prueba, estado, cargo_id, area_id, zona_id, jefe_inmediato, banco_id, tipo_cuenta, numero_cuenta, correo_corporativo, salario, created_at, updated_at) 
                    VALUES ($1, $2, $3, 'ACTIVO', $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
                `, [personaId, fechaInicio, parseDate(row['Fin de periodo de prueba']), cargoId, areaId, zonaId, clean(row['Jefe Inmediato']), bancoId, clean(row['Tipo de cuenta']), clean(row['Numero de cuenta']), row['Correo corporativo'], salario]);
            } else {
                await client.query(`UPDATE contratos SET cargo_id=$1, area_id=$2, zona_id=$3, jefe_inmediato=$4, salario=$5, updated_at=NOW() WHERE id=$6`,
                    [cargoId, areaId, zonaId, clean(row['Jefe Inmediato']), salario, check.rows[0].id]);
            }
        }

        // 2. SALIDAS
        console.log("📤 Procesando Salidas...");
        const datosSalida = await fetchSheetData(sheets, sheetId, 'Salida Colombia!A:Z');
        for (const row of datosSalida) {
            const doc = clean(row['Documento de identidad']);
            const fechaFin = parseDate(row['Fecha de terminación de contrato']);
            if (doc && fechaFin) {
                await client.query(`
                    UPDATE contratos SET estado = 'RETIRADO', fecha_fin = $1, updated_at = NOW()
                    FROM personas WHERE contratos.persona_id = personas.id AND personas.documento = $2 AND contratos.estado = 'ACTIVO'
                `, [fechaFin, doc]);
            }
        }

        await client.query('COMMIT');
        return { success: true, count: datosIngreso.length };
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Sync Error:", e);
        throw e;
    } finally { client.release(); }
}
module.exports = { syncDatabase };