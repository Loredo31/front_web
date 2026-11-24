const titulo = (s) => s.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const SEXOS = ['MASCULINO', 'FEMENINO', 'OTRO'].map((v) => ({ valor: v, texto: titulo(v) }));

export const ESTADOS_CIVILES = ['SOLTERO', 'CASADO', 'DIVORCIADO', 'VIUDO', 'UNION_LIBRE']
  .map((v) => ({ valor: v, texto: v === 'UNION_LIBRE' ? 'Unión libre' : titulo(v) }));

const NOMBRES_ESTADO = {
  CIUDAD_DE_MEXICO: 'Ciudad de México', ESTADO_DE_MEXICO: 'Estado de México', MICHOACAN: 'Michoacán',
  NUEVO_LEON: 'Nuevo León', QUERETARO: 'Querétaro', SAN_LUIS_POTOSI: 'San Luis Potosí', YUCATAN: 'Yucatán',
};

export const ESTADOS = ['AGUASCALIENTES', 'BAJA_CALIFORNIA', 'BAJA_CALIFORNIA_SUR', 'CAMPECHE', 'COAHUILA', 'COLIMA',
  'CHIAPAS', 'CHIHUAHUA', 'CIUDAD_DE_MEXICO', 'DURANGO', 'GUANAJUATO', 'GUERRERO', 'HIDALGO', 'JALISCO',
  'ESTADO_DE_MEXICO', 'MICHOACAN', 'MORELOS', 'NAYARIT', 'NUEVO_LEON', 'OAXACA', 'PUEBLA', 'QUERETARO',
  'QUINTANA_ROO', 'SAN_LUIS_POTOSI', 'SINALOA', 'SONORA', 'TABASCO', 'TAMAULIPAS', 'TLAXCALA', 'VERACRUZ',
  'YUCATAN', 'ZACATECAS'].map((v) => ({ valor: v, texto: NOMBRES_ESTADO[v] || titulo(v) }));

export const nombreEstado = (v) => ESTADOS.find((e) => e.valor === v)?.texto || v;
export const textoEnum = (v) => (v ? titulo(String(v)) : '—');

// Normaliza para comparar sin importar mayúsculas ni acentos.
export const normalizar = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();

const aOpciones = (lista) => lista.map((t) => ({ valor: t.toUpperCase(), texto: t }));

/** Si el valor guardado no está en la lista (p. ej. sin acento), lo devuelve con el formato de la lista. */
export function valorDeLista(opciones, valor) {
  const encontrado = opciones.find((o) => normalizar(o.valor) === normalizar(valor));
  return encontrado ? encontrado.valor : (valor || '');
}

// Solo letras y espacios (regla del backend).
export const NACIONALIDADES = aOpciones([
  'Mexicana', 'Estadounidense', 'Canadiense', 'Guatemalteca', 'Beliceña', 'Hondureña', 'Salvadoreña', 'Nicaragüense',
  'Costarricense', 'Panameña', 'Cubana', 'Dominicana', 'Puertorriqueña', 'Haitiana', 'Jamaiquina', 'Colombiana',
  'Venezolana', 'Ecuatoriana', 'Peruana', 'Boliviana', 'Chilena', 'Argentina', 'Uruguaya', 'Paraguaya', 'Brasileña',
  'Española', 'Portuguesa', 'Francesa', 'Italiana', 'Alemana', 'Británica', 'Irlandesa', 'Neerlandesa', 'Belga',
  'Suiza', 'Austriaca', 'Sueca', 'Noruega', 'Danesa', 'Finlandesa', 'Polaca', 'Rusa', 'Ucraniana', 'Griega', 'Turca',
  'China', 'Japonesa', 'Coreana', 'India', 'Filipina', 'Vietnamita', 'Tailandesa', 'Indonesia', 'Australiana',
  'Neozelandesa', 'Israelí', 'Libanesa', 'Egipcia', 'Marroquí', 'Nigeriana', 'Sudafricana', 'Otra',
]);

// Sin guiones ni apóstrofos (el backend solo acepta letras y espacios).
export const PAISES = aOpciones([
  'México', 'Afganistán', 'Albania', 'Alemania', 'Andorra', 'Angola', 'Antigua y Barbuda', 'Arabia Saudita', 'Argelia',
  'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaiyán', 'Bahamas', 'Bangladés', 'Barbados', 'Baréin', 'Bélgica',
  'Belice', 'Benín', 'Bielorrusia', 'Birmania', 'Bolivia', 'Bosnia y Herzegovina', 'Botsuana', 'Brasil', 'Brunéi',
  'Bulgaria', 'Burkina Faso', 'Burundi', 'Bután', 'Cabo Verde', 'Camboya', 'Camerún', 'Canadá', 'Catar', 'Chad', 'Chile',
  'China', 'Chipre', 'Colombia', 'Comoras', 'Corea del Norte', 'Corea del Sur', 'Costa de Marfil', 'Costa Rica',
  'Croacia', 'Cuba', 'Dinamarca', 'Dominica', 'Ecuador', 'Egipto', 'El Salvador', 'Emiratos Árabes Unidos', 'Eritrea',
  'Eslovaquia', 'Eslovenia', 'España', 'Estados Unidos', 'Estonia', 'Esuatini', 'Etiopía', 'Filipinas', 'Finlandia',
  'Fiyi', 'Francia', 'Gabón', 'Gambia', 'Georgia', 'Ghana', 'Granada', 'Grecia', 'Guatemala', 'Guinea',
  'Guinea Bisáu', 'Guinea Ecuatorial', 'Guyana', 'Haití', 'Honduras', 'Hungría', 'India', 'Indonesia', 'Irak', 'Irán',
  'Irlanda', 'Islandia', 'Islas Marshall', 'Islas Salomón', 'Israel', 'Italia', 'Jamaica', 'Japón', 'Jordania',
  'Kazajistán', 'Kenia', 'Kirguistán', 'Kiribati', 'Kuwait', 'Laos', 'Lesoto', 'Letonia', 'Líbano', 'Liberia', 'Libia',
  'Liechtenstein', 'Lituania', 'Luxemburgo', 'Macedonia del Norte', 'Madagascar', 'Malasia', 'Malaui', 'Maldivas',
  'Malí', 'Malta', 'Marruecos', 'Mauricio', 'Mauritania', 'Micronesia', 'Moldavia', 'Mónaco', 'Mongolia', 'Montenegro',
  'Mozambique', 'Namibia', 'Nauru', 'Nepal', 'Nicaragua', 'Níger', 'Nigeria', 'Noruega', 'Nueva Zelanda', 'Omán',
  'Países Bajos', 'Pakistán', 'Palaos', 'Palestina', 'Panamá', 'Papúa Nueva Guinea', 'Paraguay', 'Perú', 'Polonia',
  'Portugal', 'Reino Unido', 'República Centroafricana', 'República Checa', 'República del Congo',
  'República Democrática del Congo', 'República Dominicana', 'Ruanda', 'Rumania', 'Rusia', 'Samoa',
  'San Cristóbal y Nieves', 'San Marino', 'San Vicente y las Granadinas', 'Santa Lucía', 'Santo Tomé y Príncipe',
  'Senegal', 'Serbia', 'Seychelles', 'Sierra Leona', 'Singapur', 'Siria', 'Somalia', 'Sri Lanka', 'Sudáfrica', 'Sudán',
  'Sudán del Sur', 'Suecia', 'Suiza', 'Surinam', 'Tailandia', 'Tanzania', 'Tayikistán', 'Timor Oriental', 'Togo',
  'Tonga', 'Trinidad y Tobago', 'Túnez', 'Turkmenistán', 'Turquía', 'Tuvalu', 'Ucrania', 'Uganda', 'Uruguay',
  'Uzbekistán', 'Vanuatu', 'Vaticano', 'Venezuela', 'Vietnam', 'Yemen', 'Yibuti', 'Zambia', 'Zimbabue',
]);

export const esMexico = (pais) => normalizar(pais) === 'MEXICO';
