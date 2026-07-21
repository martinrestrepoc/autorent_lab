# Autorent

Autorent es un ejemplo de una aplicación web full stack para administrar una empresa de alquiler de vehículos. Incluye autenticación de administrador y permite centralizar la operación de la flota, los clientes, los alquileres y las actividades asociadas a cada vehículo.

El proyecto está dividido en un frontend desarrollado con React, una API REST construida con NestJS y una base de datos MongoDB. Los tres componentes pueden ejecutarse juntos mediante Docker Compose.

## Funcionalidades principales

- Inicio de sesión para administradores mediante JWT.
- Dashboard con resumen de vehículos, clientes y alquileres.
- Registro y administración de vehículos.
- Carga de documentos asociados a vehículos.
- Registro y administración de clientes.
- Creación, consulta, finalización y cancelación de alquileres.
- Registro de fotografías iniciales de un alquiler.
- Historial de mantenimientos por vehículo.
- Recordatorios, agenda y notificaciones.

## Tecnologías utilizadas

### Backend

- Node.js 22.
- NestJS 11.
- TypeScript.
- MongoDB 8 y Mongoose.
- Passport y JSON Web Tokens para autenticación.
- `class-validator` y `class-transformer` para validar los datos de entrada.
- Jest y Supertest para pruebas unitarias y de integración.
- ESLint y Prettier.

### Frontend

- React 19.
- TypeScript.
- Vite 7.
- React Router.
- Axios y Fetch API para comunicación con el backend.
- Tailwind CSS y estilos CSS propios.
- ESLint.

### Infraestructura y automatización

- Docker y Docker Compose.
- Nginx para servir el frontend y redirigir las solicitudes de la API.
- GitHub Actions para integración continua.
- Docker Hub como registro de imágenes para despliegue.
- Despliegue manual por SSH mediante el workflow de CD.

## Arquitectura

```text
Navegador
   |
   | http://localhost:8080
   v
Frontend (React + Nginx)
   |
   | /api
   v
Backend (NestJS, puerto 3000)
   |
   v
MongoDB (puerto 27017)
```

## Requisitos

Para ejecutar todo el proyecto con contenedores se necesita:

- Git.
- Docker Desktop, Docker Engine o una instalación equivalente.
- Docker Compose v2.

Para trabajar sin contenedores también se necesita:

- Node.js 22.
- npm.
- Una instancia de MongoDB accesible desde el backend.

## Configuración inicial

Clona el repositorio y entra al directorio del proyecto:

```bash
git clone https://github.com/martinrestrepoc/autorent_lab.git
cd autorent_lab
```

Crea el archivo local de variables de entorno:

```bash
cp .env.example .env
```

Revisa los valores de `.env` antes de iniciar la aplicación:

```dotenv
PORT=3000
MONGO_URI=mongodb://mongo:27017/autorent
JWT_SECRET=change-me
JWT_EXPIRES_IN=7d
ADMIN_EMAIL=admin@autorent.local
ADMIN_PASSWORD=change-me-too
DOCKERHUB_NAMESPACE=your_dockerhub_username
IMAGE_TAG=latest
```

En un entorno real se deben reemplazar `JWT_SECRET` y `ADMIN_PASSWORD` por valores seguros. El archivo `.env` no debe subirse al repositorio.

## Ejecutar con Docker Compose

Esta es la forma recomendada porque levanta MongoDB, el backend y el frontend con un solo comando:

```bash
docker compose up -d --build
```

Comprueba el estado de los contenedores:

```bash
docker compose ps
```

Abre la aplicación en:

```text
http://localhost:8080
```

Inicia sesión con los valores configurados en `ADMIN_EMAIL` y `ADMIN_PASSWORD` dentro de `.env`. El usuario administrador se crea automáticamente cuando inicia el backend.

Para consultar los logs:

```bash
docker compose logs -f
```

Para seguir únicamente los logs de un servicio:

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f mongo
```

Para detener los servicios sin borrar los datos:

```bash
docker compose down
```

Para detenerlos y eliminar también los volúmenes locales de MongoDB y archivos cargados:

```bash
docker compose down -v
```

> Advertencia: el último comando elimina de forma permanente los datos locales almacenados en los volúmenes del proyecto.

## Ejecutar en modo de desarrollo

Primero inicia una instancia de MongoDB. Por ejemplo, se puede levantar solamente la base de datos del archivo Compose:

```bash
docker compose up -d mongo
```

### Backend

En una terminal:

```bash
cd backend
npm ci
```

Configura variables adecuadas para una base de datos accesible desde la máquina local. Si MongoDB está expuesto por el Compose incluido, utiliza:

```bash
export PORT=3000
export MONGO_URI=mongodb://127.0.0.1:27017/autorent
export JWT_SECRET=development-secret
export JWT_EXPIRES_IN=7d
export ADMIN_EMAIL=admin@autorent.local
export ADMIN_PASSWORD=Admin123
npm run start:dev
```

La API quedará disponible en `http://localhost:3000`.

### Frontend

En otra terminal:

```bash
cd frontend
npm ci
npm run dev
```

Vite mostrará en la terminal la URL local del frontend, normalmente `http://localhost:5173`.

## Comandos útiles

### Backend

Ejecuta los siguientes comandos desde `backend/`:

```bash
# Desarrollo con recarga automática
npm run start:dev

# Compilar
npm run build

# Revisar el código sin modificar archivos
npm run lint:check

# Formatear el código
npm run format

# Pruebas unitarias
npm run test:unit

# Pruebas de integración
npm run test:integration

# Pruebas unitarias con reporte de cobertura
npm run test:cov

# Ejecutar la versión compilada
npm run start:prod
```

Las pruebas de integración requieren MongoDB y utilizan las variables de entorno definidas por el workflow de CI o por la terminal local.

### Frontend

Ejecuta los siguientes comandos desde `frontend/`:

```bash
# Servidor de desarrollo
npm run dev

# Revisar el código
npm run lint

# Compilar para producción
npm run build

# Previsualizar la compilación de producción
npm run preview
```

### Docker Compose

Ejecuta estos comandos desde la raíz del repositorio:

```bash
# Construir las imágenes
docker compose build

# Iniciar los servicios
docker compose up -d

# Ver el estado
docker compose ps

# Ver logs
docker compose logs -f

# Reiniciar un servicio
docker compose restart backend

# Detener los servicios
docker compose down
```

## Integración y despliegue continuo

El workflow de CI se ejecuta para pushes y pull requests. Valida:

- lint, compilación y pruebas del backend;
- lint y compilación del frontend;
- pruebas de integración contra un contenedor temporal de MongoDB.

El workflow de CD está configurado únicamente para ejecución manual mediante `workflow_dispatch`. De esta manera, un push a `main` no intenta desplegar automáticamente en un servidor que no esté disponible.

Cuando exista nuevamente un servidor de producción, el CD se puede ejecutar desde la pestaña **Actions** de GitHub. Antes deben configurarse los secretos de Docker Hub y SSH requeridos por el workflow y preparar el archivo `.env` de producción en `/opt/autorent`.

## Estructura del proyecto

```text
autorent_lab/
├── .github/workflows/   # Workflows de CI y CD
├── backend/             # API REST de NestJS
│   ├── src/             # Módulos, controladores, servicios y esquemas
│   └── test/            # Pruebas de integración
├── frontend/            # Aplicación React
│   ├── public/          # Recursos públicos
│   └── src/             # Páginas, componentes, autenticación y API
├── compose.yml          # Entorno local completo
├── compose.prod.yml     # Servicios para producción
└── .env.example         # Plantilla de variables de entorno
```

## Evidencias de funcionamiento

Las validaciones automáticas del proyecto están definidas en GitHub Actions. El workflow de CI compila ambos componentes, ejecuta los linters y corre las pruebas unitarias y de integración en un entorno reproducible.

Localmente se puede comprobar el funcionamiento con:

```bash
docker compose ps
curl http://localhost:3000
```

Después de iniciar sesión en `http://localhost:8080`, el dashboard permite verificar la comunicación entre el frontend, la API y MongoDB mediante los contadores de vehículos, clientes y alquileres.
