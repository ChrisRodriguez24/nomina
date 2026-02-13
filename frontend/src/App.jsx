import React, { useState, useEffect } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";
import Papa from 'papaparse';
import { Upload, Search, Calendar, Stethoscope, AlertTriangle, Settings, Plus, Save, Clock, Briefcase, DollarSign, Sun, Moon, Zap, RefreshCw, Banknote, LogOut, CheckCircle, Info, PieChart as PieIcon, TrendingUp, Activity, Users, FileSpreadsheet, Download, HelpCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const GOOGLE_CLIENT_ID = "258039517489-60eaa7084u6dnjmjrioi4vk4c391o2im.apps.googleusercontent.com";
const CSV_PATH = "/cie10.csv";
const ADMIN_EMAILS = ["crodriguezm@alocredit.co", "direccion.administrativa@alocredit.co", "gh@alocredit.co", "aux.gh@alocredit.co"];

// CONCEPTOS VISUALES MEJORADOS
const VISUAL_CONCEPTOS = {
  'RN': { icon: <Moon className="text-blue-600" size={24} />, bg: 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200', title: 'text-blue-900', pct: 'bg-blue-200 text-blue-800' },
  'HED': { icon: <Sun className="text-yellow-600" size={24} />, bg: 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200', title: 'text-yellow-900', pct: 'bg-yellow-200 text-yellow-800' },
  'HEN': { icon: <Moon className="text-indigo-600" size={24} />, bg: 'bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200', title: 'text-indigo-900', pct: 'bg-indigo-200 text-indigo-800' },
  'FSC': { icon: <Calendar className="text-orange-600" size={24} />, bg: 'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200', title: 'text-orange-900', pct: 'bg-orange-200 text-orange-800' },
  'FCC': { icon: <Calendar className="text-emerald-600" size={24} />, bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200', title: 'text-emerald-900', pct: 'bg-emerald-200 text-emerald-800' },
  'RNF': { icon: <Moon className="text-purple-600" size={24} />, bg: 'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200', title: 'text-purple-900', pct: 'bg-purple-200 text-purple-800' },
  'FD': { icon: <Sun className="text-red-600" size={24} />, bg: 'bg-gradient-to-br from-red-50 to-red-100 border-red-200', title: 'text-red-900', pct: 'bg-red-200 text-red-800' },
  'FN': { icon: <Moon className="text-rose-600" size={24} />, bg: 'bg-gradient-to-br from-rose-50 to-rose-100 border-rose-200', title: 'text-rose-900', pct: 'bg-rose-200 text-rose-800' }
};

const LEGAL_TEXT = "Autorizo de manera voluntaria, previa explícita e informada a Alo Credit Colombia SAS para tratar mis datos personales de acuerdo con la política de Tratamiento de Datos personales para los fines relacionados con su objeto y en especial para fines legales, contractuales y misionales. Así mismo acepto la política de incapacidades vigente por la compañía. (Ver política)";

const styles = {
  glass: "bg-white/95 backdrop-blur-xl border border-white/60 shadow-xl rounded-3xl overflow-hidden animate-fade-in",
  input: "w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-alo-orange text-sm transition-all focus:bg-white font-medium",
  label: "block text-xs font-bold text-gray-500 uppercase mb-1 ml-1",
  cardSelect: "border rounded-2xl p-4 cursor-pointer transition-all hover:scale-105 relative overflow-hidden h-32 flex flex-col justify-between shadow-sm hover:shadow-md",
  cardSelectActive: "ring-2 ring-offset-2 ring-blue-500 transform scale-105 shadow-lg",
  fileBtn: "border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center text-center hover:bg-orange-50 hover:border-orange-300 cursor-pointer transition-all h-32 relative",
  reqBox: "bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 text-sm text-blue-800 rounded-r-lg",
  tabActive: "bg-alo-orange text-white shadow-lg transform scale-105 ring-2 ring-orange-200",
  tabInactive: "bg-white text-gray-500 hover:bg-gray-50 border border-gray-200",
  suggestionBox: "absolute z-50 w-full bg-white shadow-xl max-h-60 overflow-y-auto rounded-lg border border-gray-200 mt-1 left-0",
  suggestionItem: "p-3 hover:bg-orange-50 cursor-pointer text-xs border-b border-gray-100 flex flex-col",
  statsCard: "bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-all",
  chartContainer: "bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-96",
  tableHeader: "px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50",
  tableCell: "px-6 py-4 whitespace-nowrap text-sm text-gray-700 border-b border-gray-100"
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('RECARGOS');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);

  // DATA
  const [configDB, setConfigDB] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [exportDates, setExportDates] = useState({ start: new Date().toISOString().slice(0, 7) + '-01', end: new Date().toISOString().slice(0, 10) });
  const [cie10List, setCie10List] = useState([]);
  const [cie10Filtered, setCie10Filtered] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [diagnosticoInput, setDiagnosticoInput] = useState('');

  // FILTER REPORTS
  const [reportFilter, setReportFilter] = useState({ year: new Date().getFullYear(), month: (new Date().getMonth() + 1).toString() });

  // FORMS
  const [novedad, setNovedad] = useState({ cedula: '', nombre: '', contratoId: 0, salario: 0, concepto: '', cantidad: '', valor: '', unidad: 'HORAS', fecha: new Date().toISOString().split('T')[0] });
  const [novedadesCart, setNovedadesCart] = useState([]); // CART
  const [incapacidad, setIncapacidad] = useState({ cedula: '', nombre: '', contratoId: 0, tipo: '', fechaInicio: '', dias: '', fechaFin: '', cie10: '', cie10Desc: '' });
  const [archivos, setArchivos] = useState({});
  const [legalCheck, setLegalCheck] = useState(false);
  const [uploadMode, setUploadMode] = useState('MANUAL'); // 'MANUAL' or 'MASIVO'

  // INIT
  useEffect(() => {
    const saved = localStorage.getItem('gh_user');
    if (saved) { try { const u = JSON.parse(saved); setUser(u); if (ADMIN_EMAILS.includes(u.email.toLowerCase())) setIsAdmin(true); } catch (e) { } }
    Papa.parse(CSV_PATH, { download: true, header: true, complete: (res) => { if (res.data) setCie10List(res.data.map(i => ({ c: i.Codigo, d: i.Nombre })).filter(i => i.c)); } });
    fetchConfig();
  }, []);

  useEffect(() => { if (activeTab === 'REPORTES') fetchReports(); }, [activeTab]);

  const fetchConfig = async () => { try { const res = await fetch('/api/config'); if (res.ok) setConfigDB(await res.json()); } catch (e) { } };
  const fetchReports = async () => { try { const res = await fetch(`/api/reportes?year=${reportFilter.year}&month=${reportFilter.month}`); if (res.ok) setReportData(await res.json()); } catch (e) { } };

  useEffect(() => { if (activeTab === 'REPORTES') fetchReports(); }, [reportFilter]);

  const buscarEmpleado = async (cedula, formType) => {
    if (!cedula) return;
    try {
      const res = await fetch(`/api/empleados/${cedula}`);
      if (res.ok) {
        const data = await res.json();
        if (formType === 'NOMINA') setNovedad(p => ({ ...p, nombre: data.nombre_completo, contratoId: data.contrato_id, salario: Number(data.salario) }));
        if (formType === 'INCAPACIDAD') setIncapacidad(p => ({ ...p, nombre: data.nombre_completo, contratoId: data.contrato_id }));
      } else alert("Empleado no encontrado.");
    } catch (e) { alert("Error buscando empleado."); }
  };

  // LOGICA NÓMINA
  const downloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Novedades');

    sheet.columns = [
      { header: 'Cedula', key: 'cedula', width: 15 },
      { header: 'Concepto', key: 'concepto', width: 15 },
      { header: 'Cantidad', key: 'cantidad', width: 10 },
      { header: 'Valor', key: 'valor', width: 15 },
      { header: 'Fecha', key: 'fecha', width: 15 }
    ];

    sheet.addRow(['12345678', 'HED', '5', '0', new Date().toISOString().split('T')[0]]);
    sheet.addRow(['12345678', 'BONO', '0', '150000', new Date().toISOString().split('T')[0]]);
    sheet.addRow(['12345678', 'RN', '10', '0', new Date().toISOString().split('T')[0]]);

    // Estilos
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    // Add reference sheet
    const refSheet = workbook.addWorksheet('Conceptos_Validos');
    refSheet.columns = [{ header: 'Código', key: 'c', width: 10 }, { header: 'Nombre', key: 'n', width: 30 }, { header: 'Porcentaje', key: 'p', width: 10 }];
    configDB.forEach(c => refSheet.addRow([c.codigo, c.nombre, c.porcentaje + '%']));
    ['LICENCIA_LUTO', 'CALAMIDAD_DOMESTICA', 'LICENCIA_NO_REMUNERADA', 'DIA_FAMILIA', 'BONO', 'COMISION'].forEach(a => refSheet.addRow([a, a.replace('_', ' '), 'N/A']));

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), 'Plantilla_Masiva_Novedades.xlsx');
  };

  const handleMassiveUpload = (file) => {
    if (!file) return;
    setLoading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const newItems = [];
        for (const row of results.data) {
          try {
            const res = await fetch(`/api/empleados/${row.Cedula}`);
            if (res.ok) {
              const emp = await res.json();
              const concepto = row.Concepto.toUpperCase().trim();
              let valorFinal = Number(row.Valor || 0);
              const cantidad = Number(row.Cantidad || 0);

              const isAusentismo = ['LICENCIA_LUTO', 'CALAMIDAD_DOMESTICA', 'LICENCIA_NO_REMUNERADA', 'DIA_FAMILIA'].includes(concepto);

              if (!isAusentismo && valorFinal === 0 && cantidad > 0) {
                const conf = configDB.find(c => c.codigo === concepto) || { porcentaje: 0 };
                const factor = 1 + (Number(conf.porcentaje) / 100);
                valorFinal = Math.round((Number(emp.salario) / 240) * factor * cantidad);
              }

              newItems.push({
                cedula: row.Cedula,
                nombre: emp.nombre_completo,
                contratoId: emp.contrato_id,
                salario: Number(emp.salario),
                concepto: concepto,
                cantidad: row.Cantidad,
                valor: valorFinal,
                unidad: isAusentismo ? 'DIAS' : (valorFinal > 0 && cantidad === 0 ? 'DINERO' : 'HORAS'),
                fecha: row.Fecha || new Date().toISOString().split('T')[0],
                isAusentismo: isAusentismo,
                id_temp: Date.now() + Math.random()
              });
            }
          } catch (e) {
            console.error("Error procesando fila:", row, e);
          }
        }
        setNovedadesCart([...novedadesCart, ...newItems]);
        setLoading(false);
        alert(`✅ Se procesaron ${newItems.length} novedades correctamente.`);
      }
    });
  };

  // LOGICA NÓMINA (CARRITO)
  const agregarAlCarrito = () => {
    if (!novedad.contratoId) return alert("⚠️ Busque empleado.");
    if (!novedad.concepto) return alert("⚠️ Seleccione concepto.");
    let valorFinal = novedad.valor;
    if (novedad.unidad === 'HORAS') {
      const conf = configDB.find(c => c.codigo === novedad.concepto) || { porcentaje: 0 };
      const factor = 1 + (Number(conf.porcentaje) / 100);
      valorFinal = Math.round((novedad.salario / 240) * factor * Number(novedad.cantidad));
    }
    const item = { ...novedad, valor: valorFinal, id_temp: Date.now() };
    setNovedadesCart([...novedadesCart, item]);
    setNovedad({ ...novedad, cantidad: '', valor: '', concepto: '' }); // Keep employee selected
  };

  const eliminarDelCarrito = (idx) => {
    const newCart = [...novedadesCart];
    newCart.splice(idx, 1);
    setNovedadesCart(newCart);
  };

  const guardarTodo = async () => {
    if (novedadesCart.length === 0) return;
    setLoading(true);
    try {
      for (const item of novedadesCart) {
        if (item.isAusentismo) {
          // Handle Multipart for Absenteeism
          const formData = new FormData();
          formData.append('contratoId', item.contratoId);
          formData.append('tipo', item.concepto); // Use concept as type
          formData.append('fechaInicio', item.fecha); // Use fecha as start
          formData.append('dias', item.cantidad); // Use cantidad as days
          if (item.files) {
            Object.keys(item.files).forEach(k => formData.append(k, item.files[k]));
          }
          await fetch('/api/radicar', { method: 'POST', body: formData });
        } else {
          // Handle JSON for Standard Payroll
          await fetch('/api/nomina', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) });
        }
      }
      alert("✅ Todas las novedades guardadas correctamente.");
      setNovedadesCart([]);
      setNovedad({ cedula: '', nombre: '', contratoId: 0, salario: 0, concepto: '', cantidad: '', valor: '', unidad: 'HORAS', fecha: new Date().toISOString().split('T')[0] });
      setArchivos({});
    } catch (e) {
      alert("Error guardando algunas novedades.");
      console.error(e);
    }
    setLoading(false);
  };

  // LOGICA INCAPACIDAD
  const handleFile = (key, file) => {
    if (file.size > 1024 * 1024) return alert("Máximo 1MB");
    if (file.type !== "application/pdf") return alert("Solo PDF");
    setArchivos(prev => ({ ...prev, [key]: file }));
  };

  const guardarIncapacidad = async (e) => {
    e.preventDefault();
    if (!incapacidad.contratoId) return alert("⚠️ Busque empleado.");
    if (!legalCheck) return alert("⚠️ Acepte política.");
    if (incapacidad.tipo === 'GENERAL' && !incapacidad.cie10) return alert("⚠️ Diagnóstico requerido.");

    const formData = new FormData();
    formData.append('contratoId', incapacidad.contratoId);
    formData.append('tipo', incapacidad.tipo);
    formData.append('fechaInicio', incapacidad.fechaInicio);
    formData.append('dias', incapacidad.dias);
    formData.append('cie10', incapacidad.cie10);
    formData.append('cie10Desc', incapacidad.cie10Desc);
    Object.keys(archivos).forEach(k => formData.append(k, archivos[k]));

    setLoading(true);
    const res = await fetch('/api/radicar', { method: 'POST', body: formData });
    if (res.ok) { alert("✅ Radicado Exitosamente"); setIncapacidad({ ...incapacidad, dias: '', cie10: '', archivos: {} }); setArchivos({}); }
    else alert("Error al radicar");
    setLoading(false);
  };

  const renderRequisitos = () => {
    switch (incapacidad.tipo) {
      case 'GENERAL': return (
        <>
          <div className={styles.reqBox}><p className="font-bold mb-2">g. Requisitos:</p><ul className="list-disc pl-5"><li>Incapacidad (PDF)</li><li>Epicrisis (PDF)</li></ul></div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <label className={styles.fileBtn}><Upload className="mb-2 text-gray-400" /><span className="text-xs font-bold">1. Cargar Incapacidad</span><input type="file" accept=".pdf" className="hidden" onChange={(e) => handleFile('incapacidad', e.target.files[0])} />{archivos['incapacidad'] && <CheckCircle className="text-green-500 absolute top-2 right-2" size={16} />}</label>
            <label className={styles.fileBtn}><Upload className="mb-2 text-gray-400" /><span className="text-xs font-bold">2. Cargar Epicrisis</span><input type="file" accept=".pdf" className="hidden" onChange={(e) => handleFile('epicrisis', e.target.files[0])} />{archivos['epicrisis'] && <CheckCircle className="text-green-500 absolute top-2 right-2" size={16} />}</label>
          </div>
        </>
      );
      case 'MATERNIDAD': return (
        <>
          <div className={styles.reqBox}><p className="font-bold mb-2">e. Requisitos:</p><ul className="list-disc pl-5"><li>Incapacidad (PDF)</li><li>Historia Clínica (con semanas, sexo, peso, talla)</li><li>Nacido Vivo</li><li>Registro Civil</li></ul></div>
          <div className="grid grid-cols-4 gap-2 mb-6">
            {['Incapacidad', 'Hist. Clínica', 'Nacido Vivo', 'Reg. Civil'].map((l, i) => (<label key={i} className={styles.fileBtn}><Upload className="mb-2 text-gray-400" /><span className="text-xs font-bold">{i + 1}. {l}</span><input type="file" accept=".pdf" className="hidden" onChange={(e) => handleFile(`archivo_${i}`, e.target.files[0])} />{archivos[`archivo_${i}`] && <CheckCircle className="text-green-500 absolute top-2 right-2" size={16} />}</label>))}
          </div>
        </>
      );
      case 'PATERNIDAD': return (
        <>
          <div className="bg-orange-50 border-l-4 border-orange-500 p-4 mb-4 text-xs text-orange-800"><p className="font-bold">NOTA:</p> Plazo máximo de entrega: 20 días después del parto.</div>
          <div className={styles.reqBox}><p className="font-bold mb-2">e. Requisitos:</p><ul className="list-disc pl-5"><li>Incapacidad (PDF)</li><li>Historia Clínica Parto</li><li>Registro Civil</li><li>Nacido Vivo</li></ul></div>
          <div className="grid grid-cols-4 gap-2 mb-6">
            {['Incapacidad', 'Hist. Parto', 'Reg. Civil', 'Nacido Vivo'].map((l, i) => (<label key={i} className={styles.fileBtn}><Upload className="mb-2 text-gray-400" /><span className="text-xs font-bold">{i + 1}. {l}</span><input type="file" accept=".pdf" className="hidden" onChange={(e) => handleFile(`archivo_pat_${i}`, e.target.files[0])} />{archivos[`archivo_pat_${i}`] && <CheckCircle className="text-green-500 absolute top-2 right-2" size={16} />}</label>))}
          </div>
        </>
      );
      case 'TRANSITO': return (
        <>
          <div className={styles.reqBox}><p className="font-bold mb-2">e. Requisitos:</p><ul className="list-disc pl-5"><li>Incapacidad (PDF)</li><li>Historia Clínica</li><li>Croquis / Declaración</li><li>Docs Vehículo</li><li>FURIPS</li></ul></div>
          <div className="grid grid-cols-5 gap-2 mb-6">
            {['Incapacidad', 'Hist. Clínica', 'Croquis', 'Docs Vehículo', 'FURIPS'].map((l, i) => (<label key={i} className={styles.fileBtn}><Upload className="mb-2 text-gray-400" /><span className="text-[9px] font-bold">{l}</span><input type="file" accept=".pdf" className="hidden" onChange={(e) => handleFile(`archivo_soat_${i}`, e.target.files[0])} />{archivos[`archivo_soat_${i}`] && <CheckCircle className="text-green-500 absolute top-2 right-2" size={16} />}</label>))}
          </div>
        </>
      );
      default: return null;
    }
  };

  const handleSearchCie10 = (t) => {
    setDiagnosticoInput(t);
    if (t.length < 3) { setShowSuggestions(false); return; }
    setCie10Filtered(cie10List.filter(i => i.c.toLowerCase().includes(t.toLowerCase()) || i.d.toLowerCase().includes(t.toLowerCase())).slice(0, 50));
    setShowSuggestions(true);
  };

  const handleLogin = (res) => {
    const d = jwtDecode(res.credential);
    if (!d.email.endsWith('@alocredit.co')) return alert("Solo @alocredit.co");
    setUser(d); localStorage.setItem('gh_user', JSON.stringify(d));
    if (ADMIN_EMAILS.includes(d.email.toLowerCase())) setIsAdmin(true);
  };

  if (!user) return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4 font-montserrat">
        <div className={`${styles.glass} p-12 max-w-md w-full text-center relative shadow-2xl`}>
          <img src="/logo.png" className="h-24 mx-auto object-contain mb-6" onError={(e) => e.target.style.display = 'none'} />
          <h1 className="text-2xl font-bold text-alo-noir mb-8">Portal GH</h1>
          <div className="flex justify-center"><GoogleLogin onSuccess={handleLogin} shape="pill" /></div>
        </div>
      </div>
    </GoogleOAuthProvider>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-12 font-montserrat text-gray-800">
      <nav className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-3"><img src="/logo.png" className="h-8" /><div className="h-6 w-px bg-gray-300"></div><span className="font-bold text-xl text-blue-900">Gestión Humana</span></div>
        <div className="flex items-center gap-4"><span className="text-sm font-bold">{user.name}</span><button onClick={() => { localStorage.removeItem('gh_user'); setUser(null); }}><LogOut size={20} /></button></div>
      </nav>

      <div className="max-w-7xl mx-auto mt-8 px-4">

        <div className="flex justify-center mb-8 gap-3 flex-wrap">
          {[{ id: 'NOVEDADES', icon: <Clock size={18} />, label: 'Centro de Novedades' }, { id: 'INCAPACIDAD', icon: <Stethoscope size={18} />, label: 'Incapacidades Médicas' }, { id: 'NOMINA', icon: <FileSpreadsheet size={18} />, label: 'Exportar Nómina' }, { id: 'REPORTES', icon: <PieIcon size={18} />, label: 'Reportes BI' }, ...(isAdmin ? [{ id: 'CONFIG', icon: <Settings size={18} />, label: 'Configuración' }] : [])]
            .map(t => <button key={t.id} onClick={() => setActiveTab(t.id)} className={`px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-sm ${activeTab === t.id ? styles.tabActive : styles.tabInactive}`}>{t.icon} {t.label}</button>)}
        </div>

        {/* MODULO NOMINA (EXPORT) */}
        {activeTab === 'NOMINA' && (
          <div className={`${styles.glass} p-8 max-w-2xl mx-auto flex flex-col items-center text-center`}>
            <div className="bg-blue-100 p-4 rounded-full mb-6"><FileSpreadsheet size={48} className="text-blue-900" /></div>
            <h2 className="text-2xl font-bold text-blue-900 mb-2">Generar Archivo de Nómina</h2>
            <p className="text-gray-500 mb-8 max-w-md">Seleccione el rango de fechas para generar el archivo plano de novedades para el proceso de nómina.</p>

            <div className="flex gap-4 mb-8 w-full max-w-md bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div className="flex-1 text-left">
                <label className={styles.label}>Fecha Inicio</label>
                <input type="date" className={styles.input} value={exportDates.start} onChange={e => setExportDates({ ...exportDates, start: e.target.value })} />
              </div>
              <div className="flex-1 text-left">
                <label className={styles.label}>Fecha Fin</label>
                <input type="date" className={styles.input} value={exportDates.end} onChange={e => setExportDates({ ...exportDates, end: e.target.value })} />
              </div>
            </div>

            <button
              onClick={() => window.open(`/api/nomina/export?start=${exportDates.start}&end=${exportDates.end}`, '_blank')}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg flex items-center gap-3 transition-all transform hover:scale-105"
            >
              <FileSpreadsheet size={24} /> DESCARGAR EXCEL
            </button>
          </div>
        )}

        {/* MODULO NOVEDADES (RECARGOS + BONOS + AUSENTISMOS) */}
        {activeTab === 'NOVEDADES' && (
          <div className="grid lg:grid-cols-12 gap-6 animate-fade-in">
            <div className={`${styles.glass} p-6 lg:col-span-8 h-fit space-y-8`}>

              {/* HEADER SEARCH & TOGGLE */}
              <div className="flex flex-col gap-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold flex items-center gap-2"><Clock /> Registrar Novedad</h3>
                  <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button onClick={() => setUploadMode('MANUAL')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${uploadMode === 'MANUAL' ? 'bg-white shadow text-blue-900' : 'text-gray-500'}`}>INDIVIDUAL</button>
                    <button onClick={() => setUploadMode('MASIVO')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${uploadMode === 'MASIVO' ? 'bg-white shadow text-blue-900' : 'text-gray-500'}`}>CARGA MASIVA</button>
                  </div>
                </div>

                {uploadMode === 'MANUAL' ? (
                  <>
                    <div className="flex gap-2">
                      <input className="flex-1 border rounded-xl p-3 font-bold" placeholder="Cédula..." value={novedad.cedula} onChange={e => setNovedad({ ...novedad, cedula: e.target.value })} />
                      <button onClick={() => buscarEmpleado(novedad.cedula, 'NOMINA')} className="bg-blue-900 text-white px-6 rounded-xl font-bold"><Search /></button>
                    </div>
                    {novedad.nombre && <div className="p-3 bg-blue-50 rounded-lg font-bold flex justify-between"><span>{novedad.nombre}</span><span>Salario: ${novedad.salario.toLocaleString()}</span></div>}
                  </>
                ) : (
                  <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 text-center">
                    <div className="mb-4">
                      <h4 className="font-bold text-blue-900 mb-1">Carga Masiva de Novedades</h4>
                      <p className="text-xs text-blue-700">Suba un archivo EXCEL con las novedades de varios empleados a la vez.</p>
                    </div>
                    <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
                      <button onClick={downloadTemplate} className="flex items-center gap-2 bg-white text-blue-900 border border-blue-200 px-6 py-3 rounded-xl font-bold text-sm hover:bg-blue-100 transition-all">
                        <Download size={18} /> Descargar Plantilla (.xlsx)
                      </button>
                      <label className="flex items-center gap-2 bg-blue-900 text-white px-6 py-3 rounded-xl font-bold text-sm cursor-pointer hover:bg-blue-800 transition-all">
                        <Upload size={18} /> {loading ? 'Procesando...' : 'Subir Excel'}
                        <input type="file" accept=".xlsx, .xls" className="hidden" onChange={(e) => handleMassiveUpload(e.target.files[0])} disabled={loading} />
                      </label>

                      <div className="relative group">
                        <button className="flex items-center gap-2 text-blue-600 font-bold text-xs hover:text-blue-800 transition-colors">
                          <HelpCircle size={14} /> Conceptos Válidos
                        </button>
                        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-64 bg-white shadow-2xl rounded-xl p-4 border border-gray-100 hidden group-hover:block z-50 animate-fade-in pointer-events-none">
                          <p className="text-[10px] font-bold text-gray-400 mb-2 uppercase">Recargos (Usar estos códigos):</p>
                          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                            {configDB.map(c => <div key={c.codigo} className="text-[10px]"><span className="font-bold text-blue-900">{c.codigo}:</span> {c.porcentaje}%</div>)}
                            <div className="text-[10px]"><span className="font-bold text-blue-900">BONO:</span> No Salarial</div>
                            <div className="text-[10px]"><span className="font-bold text-blue-900">COMISION:</span> Variable</div>
                          </div>
                          <p className="text-[10px] font-bold text-gray-400 mt-3 mb-2 uppercase">Ausentismos:</p>
                          <div className="text-[10px] space-y-1">
                            <div>LICENCIA_LUTO</div>
                            <div>CALAMIDAD_DOMESTICA</div>
                            <div>LICENCIA_NO_REMUNERADA</div>
                            <div>DIA_FAMILIA</div>
                          </div>
                          <div className="mt-3 pt-2 border-t text-[9px] text-gray-400 italic">
                            * El sistema calculará el valor automáticamente si deja la columna "Valor" en 0.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SEGMENT 1: RECARGOS */}
              <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                <h4 className="text-sm font-bold text-gray-500 uppercase mb-4 flex items-center gap-2"><Sun size={16} /> 1. Recargos & Horas Extras</h4>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {configDB.map(c => {
                    const visual = VISUAL_CONCEPTOS[c.codigo] || { icon: <Sun size={24} />, bg: 'bg-gray-50', title: 'text-gray-800', pct: 'bg-gray-200' };
                    const isActive = novedad.concepto === c.codigo;
                    return (
                      <div key={c.codigo} onClick={() => setNovedad({ ...novedad, concepto: c.codigo, unidad: 'HORAS', isAusentismo: false })} className={`${styles.cardSelect} ${visual.bg} ${isActive ? styles.cardSelectActive : 'border-transparent'}`}>
                        <div className="flex justify-between items-start">
                          <div className={`p-2 rounded-xl bg-white/60 backdrop-blur-sm shadow-sm`}>{visual.icon}</div>
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${visual.pct}`}>{c.porcentaje}%</span>
                        </div>
                        <div>
                          <h4 className={`font-bold text-sm leading-tight ${visual.title}`}>{c.nombre}</h4>
                          <p className="text-[10px] opacity-70 mt-1 font-medium">{c.descripcion}</p>
                        </div>
                        {isActive && (
                          <div className="absolute inset-0 bg-black/5 flex items-center justify-center backdrop-blur-[1px]">
                            <div className="bg-white p-2 rounded-xl shadow-xl flex flex-col items-center animate-bounce-in">
                              <span className="text-[10px] font-bold text-gray-400 mb-1">HORAS</span>
                              <input autoFocus type="number" className="w-16 text-center font-bold text-lg outline-none border-b-2 border-blue-500 bg-transparent" placeholder="0" value={novedad.cantidad} onChange={e => setNovedad({ ...novedad, cantidad: e.target.value })} onClick={(e) => e.stopPropagation()} />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SEGMENT 2: COMISIONES & BONOS */}
              <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                <h4 className="text-sm font-bold text-gray-500 uppercase mb-4 flex items-center gap-2"><DollarSign size={16} /> 2. Bonificaciones & Comisiones</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div onClick={() => setNovedad({ ...novedad, concepto: 'BONO', unidad: 'DINERO', isAusentismo: false })} className={`${styles.cardSelect} bg-gradient-to-br from-green-50 to-green-100 border-green-200 text-green-900 ${novedad.concepto === 'BONO' ? styles.cardSelectActive : ''}`}>
                    <div className="flex justify-between"><div className="p-2 bg-white/60 rounded-xl"><Banknote className="text-green-600" size={24} /></div><span className="text-[10px] font-bold bg-green-200 text-green-800 px-2 py-1 rounded-full">$</span></div>
                    <p className="font-bold text-sm mt-2">Bonificación No Salarial</p>
                    {novedad.concepto === 'BONO' && (
                      <div className="absolute inset-0 bg-black/5 flex items-center justify-center backdrop-blur-[1px]">
                        <input autoFocus type="number" className="w-24 text-center font-bold text-lg outline-none border-b-2 border-green-500 bg-white shadow-lg rounded-lg p-2" placeholder="$ Valor" value={novedad.valor} onChange={e => setNovedad({ ...novedad, valor: e.target.value })} onClick={(e) => e.stopPropagation()} />
                      </div>
                    )}
                  </div>
                  <div onClick={() => setNovedad({ ...novedad, concepto: 'COMISION', unidad: 'DINERO', isAusentismo: false })} className={`${styles.cardSelect} bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-900 ${novedad.concepto === 'COMISION' ? styles.cardSelectActive : ''}`}>
                    <div className="flex justify-between"><div className="p-2 bg-white/60 rounded-xl"><DollarSign className="text-emerald-600" size={24} /></div><span className="text-[10px] font-bold bg-emerald-200 text-emerald-800 px-2 py-1 rounded-full">%</span></div>
                    <p className="font-bold text-sm mt-2">Comisión</p>
                    {novedad.concepto === 'COMISION' && (
                      <div className="absolute inset-0 bg-black/5 flex items-center justify-center backdrop-blur-[1px]">
                        <input autoFocus type="number" className="w-24 text-center font-bold text-lg outline-none border-b-2 border-emerald-500 bg-white shadow-lg rounded-lg p-2" placeholder="$ Valor" value={novedad.valor} onChange={e => setNovedad({ ...novedad, valor: e.target.value })} onClick={(e) => e.stopPropagation()} />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SEGMENT 3: AUSENTISMOS */}
              <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                <h4 className="text-sm font-bold text-gray-500 uppercase mb-4 flex items-center gap-2"><Briefcase size={16} /> 3. Reporte de Ausentismo & Permisos</h4>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className={styles.label}>Tipo de Ausencia</label>
                    <select className={styles.input} value={novedad.isAusentismo ? novedad.concepto : ''} onChange={e => setNovedad({ ...novedad, concepto: e.target.value, isAusentismo: true, unidad: 'DIAS', cantidad: '', files: null })}>
                      <option value="">Seleccione...</option>
                      <option value="LICENCIA_LUTO">Licencia por Luto</option>
                      <option value="CALAMIDAD_DOMESTICA">Calamidad Doméstica</option>
                      <option value="LICENCIA_NO_REMUNERADA">Licencia No Remunerada</option>
                      <option value="DIA_FAMILIA">Día de la Familia</option>
                    </select>
                  </div>
                  {novedad.isAusentismo && (
                    <>
                      <div>
                        <label className={styles.label}>Fecha Inicio</label>
                        <input type="date" className={styles.input} value={novedad.fecha} onChange={e => setNovedad({ ...novedad, fecha: e.target.value })} />
                      </div>
                      <div>
                        <label className={styles.label}>Días de Ausencia</label>
                        <input type="number" className={styles.input} placeholder="Días..." value={novedad.cantidad} onChange={e => setNovedad({ ...novedad, cantidad: e.target.value })} />
                      </div>
                    </>
                  )}
                </div>

                {novedad.isAusentismo && novedad.concepto && (
                  <div className="mt-4 animate-fade-in p-4 bg-white rounded-xl border border-dashed border-gray-300">
                    {novedad.concepto === 'LICENCIA_LUTO' && (
                      <div className="grid grid-cols-2 gap-4">
                        <label className={styles.fileBtn}><Upload className="mb-2 text-gray-400" /><span className="text-xs font-bold">Cert. Defunción</span><input type="file" accept=".pdf" className="hidden" onChange={(e) => setNovedad({ ...novedad, files: { ...novedad.files, cert_defuncion: e.target.files[0] } })} />{novedad.files?.cert_defuncion && <CheckCircle className="text-green-500 absolute top-2 right-2" size={16} />}</label>
                        <label className={styles.fileBtn}><Upload className="mb-2 text-gray-400" /><span className="text-xs font-bold">Reg. Civil</span><input type="file" accept=".pdf" className="hidden" onChange={(e) => setNovedad({ ...novedad, files: { ...novedad.files, reg_civil: e.target.files[0] } })} />{novedad.files?.reg_civil && <CheckCircle className="text-green-500 absolute top-2 right-2" size={16} />}</label>
                      </div>
                    )}
                    {['CALAMIDAD_DOMESTICA', 'LICENCIA_NO_REMUNERADA', 'DIA_FAMILIA'].includes(novedad.concepto) && (
                      <label className={styles.fileBtn}><Upload className="mb-2 text-gray-400" /><span className="text-xs font-bold">Soporte (Opcional)</span><input type="file" accept=".pdf" className="hidden" onChange={(e) => setNovedad({ ...novedad, files: { ...novedad.files, soporte: e.target.files[0] } })} />{novedad.files?.soporte && <CheckCircle className="text-green-500 absolute top-2 right-2" size={16} />}</label>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-4">
                <button onClick={() => {
                  if (!novedad.contratoId) return alert("⚠️ Busque empleado.");
                  const item = { ...novedad, id_temp: Date.now() };
                  // Validation
                  if (!item.concepto) return alert("Seleccione Concepto");
                  if (!item.isAusentismo && !item.cantidad && !item.valor) return alert("Ingrese Cantidad o Valor");

                  setNovedadesCart([...novedadesCart, item]);
                  setNovedad({ ...novedad, cantidad: '', valor: '', concepto: '', isAusentismo: false, files: null });
                }} className="w-full bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold py-4 shadow-lg flex justify-center items-center gap-2 transition-all">
                  <Plus size={20} /> AGREGAR AL RESUMEN
                </button>
              </div>

            </div>

            <div className={`${styles.glass} p-6 lg:col-span-4 flex flex-col h-[calc(100vh-10rem)] sticky top-24`}>
              <div className="flex justify-between items-center mb-4 pb-4 border-b">
                <h3 className="font-bold flex items-center gap-2 text-blue-900"><Briefcase size={20} /> Resumen a Reportar</h3>
                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full">{novedadesCart.length}</span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {novedadesCart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-300">
                    <Clock size={48} className="mb-2 opacity-50" />
                    <p className="text-sm font-medium">No hay novedades cargadas</p>
                  </div>
                ) : (
                  novedadesCart.map((item, idx) => (
                    <div key={idx} className="bg-white border p-3 rounded-xl shadow-sm flex justify-between items-center group hover:bg-red-50 transition-colors">
                      <div>
                        <p className="font-bold text-xs text-gray-800">{item.nombre}</p>
                        <p className="text-[10px] text-gray-500 font-medium">
                          {item.concepto} <br />
                          {item.isAusentismo ? (
                            <span className="text-blue-600 font-bold">{item.fecha} | {item.cantidad} Días {item.files ? '(+Soportes)' : ''}</span>
                          ) : (
                            <span>{item.unidad === 'HORAS' ? `${item.cantidad} Hrs` : `$${Number(item.valor).toLocaleString()}`}</span>
                          )}
                        </p>
                      </div>
                      <button onClick={() => eliminarDelCarrito(idx)} className="text-gray-300 group-hover:text-red-500 transition-colors"><LogOut size={16} /></button>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-4 border-t mt-4">
                <button onClick={guardarTodo} disabled={novedadesCart.length === 0} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2">
                  <Save size={18} /> CONFIRMAR Y GUARDAR
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODULO INCAPACIDAD (ESTRICTO) */}
        {activeTab === 'INCAPACIDAD' && (
          <form onSubmit={guardarIncapacidad} className="bg-white p-8 rounded-2xl shadow-xl border border-gray-200 max-w-4xl mx-auto">
            <div className="bg-blue-900 text-white p-4 -mt-8 -mx-8 mb-8 rounded-t-2xl"><h2 className="font-bold text-lg">Reporte de Ausentismo</h2></div>

            <div className="mb-6"><label className={styles.label}>1. Seleccione Tipo de Incapacidad</label><select className={styles.input} onChange={e => setIncapacidad({ ...incapacidad, tipo: e.target.value })}><option value="">Seleccione...</option><option value="GENERAL">Enfermedad General</option><option value="MATERNIDAD">Licencia Maternidad</option><option value="PATERNIDAD">Licencia Paternidad</option><option value="LABORAL">Accidente Laboral</option><option value="TRANSITO">Accidente Tránsito</option></select></div>


            {incapacidad.tipo && (
              <div className="animate-fade-in">
                <div className="grid md:grid-cols-2 gap-6 mb-6 pb-6 border-b">
                  <div><label className={styles.label}>a. Cédula</label><div className="flex gap-2"><input className={styles.input} value={incapacidad.cedula} onChange={e => setIncapacidad({ ...incapacidad, cedula: e.target.value })} /><button type="button" onClick={() => buscarEmpleado(incapacidad.cedula, 'INCAPACIDAD')} className="bg-blue-900 text-white px-3 rounded-lg"><Search size={16} /></button></div></div>
                  <div><label className={styles.label}>b. Nombre</label><input className={`${styles.input} bg-gray-100`} readOnly value={incapacidad.nombre} /></div>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div><label className={styles.label}>c. Fecha Inicio</label><input type="date" className={styles.input} onChange={e => setIncapacidad({ ...incapacidad, fechaInicio: e.target.value })} /></div>
                  <div><label className={styles.label}>d. Días</label><input type="number" className={styles.input} onChange={e => setIncapacidad({ ...incapacidad, dias: e.target.value })} /></div>
                </div>

                {incapacidad.tipo === 'GENERAL' && (
                  <div className="mb-6 relative">
                    <label className={styles.label}>Diagnóstico CIE-10</label>
                    <input className={styles.input} placeholder="Buscar por código o nombre..." value={diagnosticoInput} onChange={e => {
                      const val = e.target.value;
                      setDiagnosticoInput(val);
                      if (val.length > 2) {
                        const search = val.toLowerCase();
                        setCie10Filtered(cie10List.filter(i => i.c.toLowerCase().includes(search) || i.d.toLowerCase().includes(search)).slice(0, 50));
                        setShowSuggestions(true);
                      }
                    }} />
                    {showSuggestions && <div className={styles.suggestionBox}>{cie10Filtered.map((i, x) => <div key={x} className={styles.suggestionItem} onClick={() => { setIncapacidad({ ...incapacidad, cie10: i.c, cie10Desc: i.d }); setDiagnosticoInput(`${i.c} - ${i.d}`); setShowSuggestions(false); }}>{i.c} - {i.d}</div>)}</div>}
                  </div>
                )}

                {renderRequisitos()}

                <div className="flex items-start gap-3 mb-8 bg-gray-50 p-4 rounded-lg">
                  <input type="checkbox" className="mt-1" onChange={e => setLegalCheck(e.target.checked)} />
                  <label className="text-xs text-justify">{LEGAL_TEXT}</label>
                </div>

                <button disabled={loading} className="w-full bg-orange-500 text-white font-bold py-4 rounded-xl shadow-lg">{loading ? 'Enviando...' : 'RADICAR'}</button>
              </div>
            )}
          </form>
        )}

        {/* REPORTES BI */}
        {activeTab === 'REPORTES' && reportData && (
          <div className="animate-fade-in space-y-12">
            {/* 1. SECCION RECARGOS & VARIABLES */}
            <div>
              <h2 className="text-2xl font-bold text-blue-900 mb-6 flex items-center gap-2"><DollarSign /> Análisis de Recargos & Variables</h2>
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className={styles.chartContainer}>
                  <h3 className="font-bold mb-4 text-gray-500 text-sm">Distribución por Concepto</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={reportData.recargos.byConcept} cx="50%" cy="50%" outerRadius={100} fill="#8884d8" dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {reportData.recargos.byConcept.map((e, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className={styles.chartContainer}>
                  <h3 className="font-bold mb-4 text-gray-500 text-sm">Tendencia Mensual</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={reportData.recargos.history}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                      <Line type="monotone" dataKey="total" stroke="#f97316" strokeWidth={3} dot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* 2. SECCION INCAPACIDADES MEJORADA */}
            <div>
              <div className="flex justify-between items-end mb-6">
                <h2 className="text-2xl font-bold text-blue-900 flex items-center gap-2"><Stethoscope /> Análisis de Ausentismo</h2>
                <div className="flex gap-2">
                  <select className={styles.input} value={reportFilter.year} onChange={e => setReportFilter({ ...reportFilter, year: e.target.value })}>
                    {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <select className={styles.input} value={reportFilter.month} onChange={e => setReportFilter({ ...reportFilter, month: e.target.value })}>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('es-ES', { month: 'long' })}</option>)}
                  </select>
                </div>
              </div>

              {/* KPI CARDS */}
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
                  <p className="text-blue-100 text-sm font-bold mb-1">Días Totales Incapacidad</p>
                  <h3 className="text-4xl font-bold">{reportData.incapacidades.byType.reduce((a, b) => a + Number(b.value), 0)}</h3>
                </div>
                <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-6 text-white shadow-lg">
                  <p className="text-red-100 text-sm font-bold mb-1">Tasa Ausentismo Global</p>
                  <h3 className="text-4xl font-bold">{(reportData.incapacidades.absenteeism.reduce((a, b) => a + b.rate, 0) / Math.max(1, reportData.incapacidades.absenteeism.length)).toFixed(2)}%</h3>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg">
                  <p className="text-emerald-100 text-sm font-bold mb-1">Área Más Afectada</p>
                  <h3 className="text-2xl font-bold mt-1 line-clamp-1">{reportData.incapacidades.absenteeism[0]?.area || 'N/A'}</h3>
                  <p className="text-emerald-100 text-xs">{(reportData.incapacidades.absenteeism[0]?.rate || 0)}% Tasa</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className={styles.chartContainer}>
                  <h3 className="font-bold mb-4 text-gray-500 text-sm">Distribución por Tipo</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={reportData.incapacidades.byType} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {reportData.incapacidades.byType.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className={styles.chartContainer}>
                  <h3 className="font-bold mb-4 text-gray-500 text-sm">Tasa de Ausentismo por Área (%)</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData.incapacidades.absenteeism} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" unit="%" />
                      <YAxis dataKey="area" type="category" width={100} tick={{ fontSize: 10 }} />
                      <Tooltip cursor={{ fill: 'transparent' }} formatter={(val) => `${val}%`} />
                      <Bar dataKey="rate" fill="#f87171" radius={[0, 10, 10, 0]} barSize={20}>
                        {reportData.incapacidades.absenteeism.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#ef4444' : '#fca5a5'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CONFIGURACIÓN UX MEJORADA */}
        {activeTab === 'CONFIG' && isAdmin && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-8 border-b flex justify-between items-center bg-gray-50">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Configuración del Sistema</h2>
                <p className="text-gray-500 text-sm mt-1">Gestione los parámetros globales de la aplicación</p>
              </div>
              <button onClick={() => fetch('/api/sync-sheets', { method: 'POST' }).then(() => alert('Sincronización Completada'))} className="bg-blue-900 hover:bg-blue-800 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg flex items-center gap-2 transition-all"><RefreshCw size={18} /> Sincronizar Google Sheets</button>
            </div>
            <div className="p-8">
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className={styles.tableHeader}>Código</th>
                      <th className={styles.tableHeader}>Concepto</th>
                      <th className={styles.tableHeader}>Descripción</th>
                      <th className={styles.tableHeader}>Porcentaje Actual</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {configDB.map(c => (
                      <tr key={c.codigo} className="hover:bg-gray-50 transition-colors group">
                        <td className={styles.tableCell}><span className="bg-blue-100 text-blue-800 py-1 px-3 rounded-full text-xs font-bold">{c.codigo}</span></td>
                        <td className={styles.tableCell}><span className="font-bold">{c.nombre}</span></td>
                        <td className={`${styles.tableCell} w-1/2`}>
                          <input
                            className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none transition-all py-1 text-gray-600"
                            defaultValue={c.descripcion}
                            onBlur={(e) => fetch('/api/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codigo: c.codigo, porcentaje: c.porcentaje, descripcion: e.target.value }) })}
                          />
                        </td>
                        <td className={styles.tableCell}>
                          <div className="flex items-center gap-2">
                            <input
                              className="w-20 text-center border-2 border-gray-200 rounded-lg p-2 font-bold focus:border-blue-500 outline-none transition-all"
                              defaultValue={c.porcentaje}
                              onBlur={(e) => fetch('/api/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codigo: c.codigo, porcentaje: e.target.value, descripcion: c.descripcion }) })}
                            />
                            <span className="font-bold text-gray-400">%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;