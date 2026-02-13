-- 1. MAESTRAS
CREATE TABLE IF NOT EXISTS cargos (id SERIAL PRIMARY KEY, nombre VARCHAR(150) UNIQUE NOT NULL);
CREATE TABLE IF NOT EXISTS areas (id SERIAL PRIMARY KEY, nombre VARCHAR(100) UNIQUE NOT NULL);
CREATE TABLE IF NOT EXISTS bancos (id SERIAL PRIMARY KEY, nombre VARCHAR(100) UNIQUE NOT NULL);
CREATE TABLE IF NOT EXISTS entidades (id SERIAL PRIMARY KEY, nombre VARCHAR(100) NOT NULL, tipo VARCHAR(50) NOT NULL, UNIQUE(nombre, tipo));

-- 2. CONFIGURACIÓN (Recargos Editables)
CREATE TABLE IF NOT EXISTS configuracion_conceptos (
    codigo VARCHAR(20) PRIMARY KEY,
    nombre VARCHAR(100),
    descripcion VARCHAR(200),
    porcentaje NUMERIC(5,2), 
    categoria VARCHAR(50)
);

INSERT INTO configuracion_conceptos (codigo, nombre, descripcion, porcentaje, categoria) VALUES
('HED', 'Extra Diurna', '6:00 AM - 9:00 PM', 25.00, 'EXTRA'),
('HEN', 'Extra Nocturna', '9:00 PM - 6:00 AM', 75.00, 'EXTRA'),
('HEDDF', 'Dom/Fes Diurna', 'Festivo 6AM-9PM', 100.00, 'DOMINICAL'),
('HENDF', 'Dom/Fes Noct', 'Festivo 9PM-6AM', 150.00, 'DOMINICAL'),
('RN', 'Recargo Nocturno', 'Solo Recargo', 35.00, 'RECARGO'),
('RNDF', 'Recargo Dom/Fes', 'Solo Recargo', 75.00, 'DOMINICAL')
ON CONFLICT (codigo) DO NOTHING;

-- 3. EMPLEADOS
CREATE TABLE IF NOT EXISTS personas (
    id SERIAL PRIMARY KEY,
    documento VARCHAR(20) UNIQUE NOT NULL,
    tipo_documento VARCHAR(50),
    primer_apellido VARCHAR(100),
    segundo_apellido VARCHAR(100),
    primer_nombre VARCHAR(100),
    segundo_nombre VARCHAR(100),
    nombre_completo VARCHAR(250),
    fecha_nacimiento DATE,
    genero VARCHAR(20),
    rh VARCHAR(10),
    estado_civil VARCHAR(50),
    direccion_residencia VARCHAR(255),
    ciudad_residencia VARCHAR(100),
    celular VARCHAR(20),
    correo_personal VARCHAR(150),
    contacto_emergencia VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. CONTRATOS
CREATE TABLE IF NOT EXISTS contratos (
    id SERIAL PRIMARY KEY,
    persona_id INTEGER REFERENCES personas(id),
    fecha_inicio DATE,
    fecha_fin_prueba DATE,
    fecha_fin DATE,
    estado VARCHAR(20) DEFAULT 'ACTIVO',
    cargo_id INTEGER REFERENCES cargos(id),
    area_id INTEGER REFERENCES areas(id),
    zona_id INTEGER REFERENCES zonas(id),
    jefe_inmediato VARCHAR(150),
    banco_id INTEGER REFERENCES bancos(id),
    tipo_cuenta VARCHAR(50),
    numero_cuenta VARCHAR(50),
    correo_corporativo VARCHAR(150),
    salario NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. NOVEDADES (Tabla Única para Todo)
CREATE TABLE IF NOT EXISTS novedades (
    id SERIAL PRIMARY KEY,
    contrato_id INTEGER REFERENCES contratos(id),
    tipo_registro VARCHAR(50), -- 'NOMINA' o 'INCAPACIDAD'
    
    -- Campos Nómina
    concepto_codigo VARCHAR(20),
    concepto_nombre VARCHAR(100),
    cantidad NUMERIC(12,2), 
    valor NUMERIC(12,2), 
    unidad VARCHAR(20),
    
    -- Campos Incapacidad
    tipo_incapacidad VARCHAR(50), -- GENERAL, MATERNIDAD, ETC.
    cie10_codigo VARCHAR(20),
    cie10_descripcion TEXT,
    archivos_adjuntos JSONB, -- Guardará los nombres de los PDFs
    
    -- Comunes
    fecha_novedad DATE NOT NULL,
    fecha_fin DATE,
    dias INTEGER,
    observacion TEXT,
    estado VARCHAR(20) DEFAULT 'PENDIENTE',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);