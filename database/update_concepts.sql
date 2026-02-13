-- ACTUALIZACIÓN DE CONCEPTOS DE NÓMINA - ALÓ CREDIT
TRUNCATE TABLE configuracion_conceptos;

INSERT INTO configuracion_conceptos (codigo, nombre, descripcion, porcentaje, categoria) VALUES
('RN',    'Recargo Nocturno',                      '35% - Jornada Ordinaria de 9PM a 6AM', 35.00,  'RECARGO'),
('HED',   'Hora Extra Diurna',                     '125% - Adicional a jornada de 6AM a 9PM', 125.00, 'EXTRA'),
('HEN',   'Hora Extra Nocturna',                   '175% - Adicional a jornada de 9PM a 6AM', 175.00, 'EXTRA'),
('FSC',   'Festivo/Dominical sin Compensatorio',   '80% - Trabajo en día de descanso', 80.00,  'DOMINICAL'),
('FCC',   'Festivo/Dominical con Compensatorio',   '180% - Trabajo en día de descanso + compensatorio', 180.00, 'DOMINICAL'),
('RNF',   'Recargo Nocturno Festivo',              '215% - Nocturno en día festivo', 215.00, 'DOMINICAL'),
('FD',    'Hora Extra Festiva Diurna',             '205% - Extra diurna en festivo', 205.00, 'DOMINICAL'),
('FN',    'Hora Extra Festiva Nocturna',           '255% - Extra nocturna en festivo', 255.00, 'DOMINICAL')
ON CONFLICT (codigo) DO UPDATE SET 
    nombre = EXCLUDED.nombre, 
    porcentaje = EXCLUDED.porcentaje, 
    descripcion = EXCLUDED.descripcion;
