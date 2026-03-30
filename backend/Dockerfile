# multi-stage build (varios FROM)
# sirve para no tener que reconstruir todo cada vez (lo que no cambia se ejecuta desde cache).
# también sirve para hacer la imagen final más pequeña, más limpia y más segura.

#----------------------------------------ETAPA 1-----------------------------------------------------------

# se instala todo lo que está en el package.json incluyendo devDependencies que no se necesitan en prod.
# Por ejemplo: TypeScript porque Node ejecuta JavaScript o herramientas que ayudan al desarrollo pero no 
# a la ejecución de la aplicación (lint, prettier), para que la imagen sea más pequeña y limpia.
FROM node:22-alpine AS deps
WORKDIR /app

COPY package*.json ./

# continuous integration (instalación limpia para builds automáticos):
    # rm -rf node_modules
    # leer package-lock.json
    # instalar exactamente esas versiones
RUN npm ci

#----------------------------------------ETAPA 2-----------------------------------------------------------
# empieza una nueva etapa, pero en vez de usar node:22-alpine, usa la imagen que resultó de la etapa deps (hereda el WORKDIR).
# se separa en otra etapa porque para compilar se necesitan cosas que no se quieren en producción
FROM deps AS build
COPY nest-cli.json tsconfig*.json ./
COPY src ./src
# compila la aplicación (genera el dist)
RUN npm run build

#----------------------------------------ETAPA 3-----------------------------------------------------------
# Instala solo las dependencias de producción
FROM node:22-alpine AS prod-deps
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

#----------------------------------------ETAPA 4-----------------------------------------------------------
# Usa el dist y las dependencias para correr la aplicación
FROM node:22-alpine AS runner
WORKDIR /app

# Crea una variable de entorno dentro de la imagen 
# NODE_ENV=production hace que Node y muchas librerías se ejecuten en modo producción, 
# desactivando cosas de desarrollo y activando optimizaciones.
ENV NODE_ENV=production

# COPY <origen> <destino>
# Desde prod-deps /app/node_modules a runner /app/node_modules
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package*.json ./

# Crear la carpeta donde se van a guardar archivos en el backend y darle permisos al usuario node para que pueda escribir ahí.
# De esta forma node puede guardar archivos en la carpeta uploads.
RUN mkdir -p /app/uploads && chown -R node:node /app

# Todo lo que venga después de USER node se ejecuta como ese usuario.
# Deja de usar root y empieza a usar el usuario node, que ya viene creado en la imagen oficial de Node.
USER node
# En producción casi siempre se evita root.

# sirve para documentar que este contenedor ejecuta una aplicación que escucha en el puerto 3000 dentro del contenedor.
EXPOSE 3000

ENTRYPOINT ["node", "dist/main.js"]


# Las dos primeras etapas se usan para instalar todas las dependencias y compilar la aplicación, la tercera instala 
# nuevamente solo las dependencias necesarias para producción, y la cuarta crea la imagen final copiando únicamente lo 
# necesario para ejecutar la aplicación.

# package.json — define qué dependencias quieres (Ej: quiero Nest versión compatible con ^10.0.0: 10.0.1, 10.5.3, no 11.3.4)
# package-lock.json — fija las versiones exactas (npm hace dependency resolution)