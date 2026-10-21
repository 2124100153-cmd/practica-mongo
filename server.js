require('dotenv').config();
const http = require('http');
const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = process.env.MONGO_URI;
if (!uri) {
  console.error('Error: Falta la variable MONGO_URI en el archivo .env');
  process.exit(1);
}

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true
  }
});

const PORT = 3000;

function generarTablaHTML(alumnos) {
  let filas = '';
  alumnos.forEach(alumno => {
    filas += `
        <tr>
          <td>${alumno.nombre}</td>
          <td>${alumno.matricula}</td>
          <td>${alumno.carrera}</td>
          <td>${alumno.promedio}</td>
          <td>${alumno.activo ? 'Sí' : 'No'}</td>
        </tr>`;
  });

  return `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8">
    <title>Alumnos desde MongoDB Atlas</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 40px; background: #f4f6f8; }
      h1 { color: #00684a; }
      table { width: 100%; border-collapse: collapse; background: white; }
      th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
      th { background: #00684a; color: white; }
      tr:nth-child(even) { background: #f9f9f9; }
    </style>
  </head>
  <body>
    <h1>Listado de alumnos</h1>
    <p>Datos obtenidos desde MongoDB Atlas</p>
    <table>
      <thead>
        <tr>
          <th>Nombre</th><th>Matrícula</th><th>Carrera</th><th>Promedio</th><th>Activo</th>
        </tr>
      </thead>
      <tbody>${filas}
      </tbody>
    </table>
  </body>
  </html>`;
}

function enviarJSON(res, codigo, datos) {
  res.writeHead(codigo, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(datos, null, 2));
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const ruta = url.pathname;
    const carrera = url.searchParams.get('carrera'); // ?carrera=...
    const coleccion = client.db('practica_js').collection('alumnos');

    // Filtro opcional por carrera
    const filtro = {};
    if (carrera) filtro.carrera = carrera;

    if (ruta === '/api/alumnos') {
      const alumnos = await coleccion.find(filtro).toArray();
      enviarJSON(res, 200, alumnos);

    } else if (ruta === '/api/alumnos/activos') {
      const activos = await coleccion.find({ ...filtro, activo: true }).toArray();
      enviarJSON(res, 200, activos);

    } else if (ruta === '/api/alumnos/nuevo') {
      // insertOne desde JavaScript
      const resultado = await coleccion.insertOne({
        nombre: 'Sofía Ramírez',
        matricula: 'A006',
        carrera: 'Desarrollo de Software',
        promedio: 9.0,
        activo: true
      });
      enviarJSON(res, 201, { mensaje: 'Alumno insertado', insertedId: resultado.insertedId });

    } else {
      const alumnos = await coleccion.find(filtro).toArray();
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(generarTablaHTML(alumnos));
    }
  } catch (error) {
    console.error('Error al consultar MongoDB:', error);
    enviarJSON(res, 500, { error: 'No se pudo conectar a MongoDB Atlas' });
  }
});

async function iniciar() {
  try {
    await client.connect();
    await client.db('admin').command({ ping: 1 });
    console.log('Conectado a MongoDB Atlas');
    server.listen(PORT, () => {
      console.log(`Servidor activo en http://localhost:${PORT}`);
      console.log(`JSON disponible en http://localhost:${PORT}/api/alumnos`);
    });
  } catch (error) {
    console.error('No se pudo conectar:', error.message);
    process.exit(1);
  }
}

iniciar();