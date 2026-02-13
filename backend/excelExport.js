const ExcelJS = require('exceljs');

const generatePayrollReport = async (client, startDate, endDate) => {
    // 1. Fetch Data
    // Get all contracts active in the period or with novelties in the period
    // Since we need to report even if 0, get all active contracts + those with novelties.
    // For simplicity, get all contracts active at any point in the period.

    const query = `
        SELECT 
            p.documento, p.nombre_completo, 
            c.id as contrato_id, c.cargo_id, c.area_id, c.fecha_inicio, c.fecha_fin, c.salario,
            car.nombre as cargo, a.nombre as area
        FROM contratos c
        JOIN personas p ON c.persona_id = p.id
        LEFT JOIN cargos car ON c.cargo_id = car.id
        LEFT JOIN areas a ON c.area_id = a.id
        WHERE (c.fecha_fin IS NULL OR c.fecha_fin >= $1) AND c.fecha_inicio <= $2
        ORDER BY p.nombre_completo
    `;
    const contractsRes = await client.query(query, [startDate, endDate]);
    const contracts = contractsRes.rows;

    // Get Novelties for the period
    const novQuery = `
        SELECT * FROM novedades 
        WHERE fecha_novedad BETWEEN $1 AND $2 
    `;
    const novRes = await client.query(novQuery, [startDate, endDate]);
    const novelties = novRes.rows;

    // 2. Process Data
    const data = contracts.map(c => {
        const empNovs = novelties.filter(n => n.contrato_id === c.contrato_id);

        // Initialize Row Record
        const row = {
            cedula: c.documento,
            nombre: c.nombre_completo.toUpperCase(),
            cargo: c.cargo || '',
            fecha_ingreso: c.fecha_inicio,
            fecha_retiro: c.fecha_fin,
            centro_costos: c.area || '',

            // Recargos
            hed: 0, hen: 0, heddf: 0, hendf: 0, rn: 0, rndf: 0,

            // Devengados
            comisiones: 0, bonif_salarial: 0,
            aux_rod: 0, movilizacion: 0, alimentacion: 0, vivienda: 0, comunicacion: 0, bonif_noprest: 0,

            // Incapacidades (Flags usually, or days? Image implies types)
            inc_emp: '', inc_gen: '', inc_trab: '', lic_mat: '', lic_pat: '',
            dias_inc: 0, ini_inc: '', fin_inc: '', cie10: '',

            // Descuentos
            desc_gen: 0, afc: 0, embargo: 0, libranza: 0,

            // Ausentismos
            lic_luto: 0, cal_dom: 0, lic_no_rem: 0, dia_fam: 0,

            observaciones: ''
        };

        // Aggregate Novelties
        empNovs.forEach(n => {
            if (n.tipo_registro === 'NOMINA') {
                const code = n.concepto_codigo;
                const val = parseFloat(n.valor || 0) || parseFloat(n.cantidad || 0); // Use value or quantity depending on concept type? 
                // Usually Report needs VALUES for Money concepts and HOURS for Hour concepts.
                // Assuming 'HED', 'HEN' are Hours. 'BONO', 'COMISION' are Money.

                if (['HED', 'HEN', 'HEDDF', 'HENDF', 'RN', 'RNDF'].includes(code)) {
                    row[code.toLowerCase()] += parseFloat(n.cantidad || 0);
                } else if (code === 'COMISION') {
                    row.comisiones += parseFloat(n.valor || 0);
                } else if (code === 'BONO') {
                    row.bonif_salarial += parseFloat(n.valor || 0); // Assuming Salarial for now
                }
                // Check other concepts if defined...
            } else if (n.tipo_registro === 'INCAPACIDAD') {
                // Determine Type column
                const type = n.tipo_incapacidad; // GENERAL, MATERNIDAD, ETC.
                if (type === 'GENERAL') { row.inc_gen = 'X'; row.cie10 = n.cie10_codigo; }
                else if (type === 'MATERNIDAD') row.lic_mat = 'X';
                else if (type === 'PATERNIDAD') row.lic_pat = 'X';
                else if (type === 'LABORAL') row.inc_trab = 'X';
                else if (type === 'LICENCIA_LUTO') row.lic_luto += parseInt(n.dias || 0);
                else if (type === 'CALAMIDAD_DOMESTICA') row.cal_dom += parseInt(n.dias || 0);
                else if (type === 'LICENCIA_NO_REMUNERADA') row.lic_no_rem += parseInt(n.dias || 0);
                else if (type === 'DIA_FAMILIA') row.dia_fam += parseInt(n.dias || 0);
                else row.inc_emp = 'X'; // Default/Other

                // Only add to Total Days Incap if it is an INC/LIC (Not Permisos which are counted in own columns usually? 
                // But the excel has specific columns for them. 'dias_inc' usually refers to medical incapacities?
                // For safety, let's keep dias_inc for Medical ones.
                if (['GENERAL', 'MATERNIDAD', 'PATERNIDAD', 'LABORAL', 'TRANSITO'].includes(type)) {
                    row.dias_inc += parseInt(n.dias || 0);
                }

                // Set dates (taking last one found or comma separate if multiple)
                if (!row.ini_inc) row.ini_inc = n.fecha_novedad;
                if (!row.fin_inc) row.fin_inc = n.fecha_fin;
            }
        });

        return row;
    }).filter(row => {
        // Filter out rows where all values are 0 or empty (except identification)
        const hasValues =
            row.hed > 0 || row.hen > 0 || row.heddf > 0 || row.hendf > 0 || row.rn > 0 || row.rndf > 0 ||
            row.comisiones > 0 || row.bonif_salarial > 0 ||
            row.dias_inc > 0 ||
            row.lic_luto > 0 || row.cal_dom > 0 || row.lic_no_rem > 0 || row.dia_fam > 0;

        return hasValues;
    });

    // 3. Create Excel
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Nomina');

    // Define Headers (Complex Merged Headers)
    // Row 1: Merge Categories
    // Row 2: Sub-headers

    // We'll just do simple headers for now to ensure data is there, formatted nicely.
    // Ideally we match the image, but exact pixel matching is hard without coordinates.
    // I'll create the structure.

    sheet.columns = [
        { header: 'CÉDULA', key: 'cedula', width: 15 },
        { header: 'NOMBRE DEL TRABAJADOR', key: 'nombre', width: 35 },
        { header: 'CARGO', key: 'cargo', width: 20 },
        { header: 'FECHA INGRESO', key: 'fecha_ingreso', width: 15 },
        { header: 'FECHA RETIRO', key: 'fecha_retiro', width: 15 },
        { header: 'CENTRO COSTOS', key: 'centro_costos', width: 20 },
        // RECARGOS
        { header: 'H.E.D', key: 'hed', width: 8 },
        { header: 'H.E.N', key: 'hen', width: 8 },
        { header: 'H.E.D.D.F', key: 'heddf', width: 10 },
        { header: 'H.E.N.D.F', key: 'hendf', width: 10 },
        { header: 'R.N', key: 'rn', width: 8 },
        { header: 'R.N.D.F', key: 'rndf', width: 10 },
        // DEVENGADOS
        { header: 'COMISIONES', key: 'comisiones', width: 15 },
        { header: 'BONIF. NO SALARIAL', key: 'bonif_salarial', width: 20 },
        // NO PRESTACIONALES
        { header: 'AUX RODAMIENTO', key: 'aux_rod', width: 15 },
        { header: 'AUX MOVILIZACION', key: 'movilizacion', width: 15 },
        { header: 'AUX ALIMENTACION', key: 'alimentacion', width: 15 },
        { header: 'AUX VIVIENDA', key: 'vivienda', width: 15 },
        { header: 'AUX COMUNICACION', key: 'comunicacion', width: 15 },
        { header: 'BONIF. NO PREST', key: 'bonif_noprest', width: 15 },
        // INCAPACIDADES
        { header: 'CIE10', key: 'cie10', width: 8 },
        { header: 'INC EMP', key: 'inc_emp', width: 5 },
        { header: 'INC GEN', key: 'inc_gen', width: 5 },
        { header: 'INC TRAB', key: 'inc_trab', width: 5 },
        { header: 'LIC MAT', key: 'lic_mat', width: 5 },
        { header: 'LIC PAT', key: 'lic_pat', width: 5 },
        { header: 'DIAS', key: 'dias_inc', width: 5 },
        { header: 'FECHA INICIO', key: 'ini_inc', width: 12 },
        { header: 'FECHA FINAL', key: 'fin_inc', width: 12 },
        // DESCUENTOS
        { header: 'GENERAL', key: 'desc_gen', width: 10 },
        { header: 'AFC', key: 'afc', width: 10 },
        { header: 'EMBARGO', key: 'embargo', width: 10 },
        { header: 'LIBRANZA', key: 'libranza', width: 10 },
        // AUSENTISMOS
        { header: 'LIC LUTO', key: 'lic_luto', width: 8 },
        { header: 'CALAM DOM', key: 'cal_dom', width: 8 },
        { header: 'LIC NO REM', key: 'lic_no_rem', width: 8 },
        { header: 'DIA FAM', key: 'dia_fam', width: 8 },
        { header: 'OBSERVACIONES', key: 'observaciones', width: 30 }
    ];

    // Style Headers
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D47A1' } }; // Blue Header

    // Add Data
    data.forEach(d => {
        sheet.addRow(d);
    });

    return workbook;
};

module.exports = { generatePayrollReport };
