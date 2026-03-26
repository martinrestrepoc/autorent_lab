#----------------------------------------ETAPA 1-----------------------------------------------------------
# Vite se usa para desarrollo y para compilar el frontend, pero no se usa normalmente como servidor en producción.
# La función de servir los archivos en producción, la cumple nginx, por ende, vite solo se usa para el build (dist).

# No se necesitan las dependencias de desarrollo, porque en la imagen final no se ejecuta node, porque
# nginx se usa para servir los archivos estáticos generados en dist y también para hacer las peticiones al backend (proxy).

# Solo se usa node para hacer el build que necesita React, Vite para hacer el dist
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

#----------------------------------------ETAPA 2-----------------------------------------------------------
# Nginx sirve los archivos estaticos del build al navegador y hace proxy al backend de las peticiones recibidas, evitando 
# usar CORS y que node sirva los archivos estáticos, puesto que no está optimizado para eso.

# Además nginx sirve para que haya un punto de entrada único, evitando que cada servicio use un puerto 
# para que todo pase por un solo servidor, aumentando la seguridad.
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runner

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

ENTRYPOINT ["nginx", "-g", "daemon off;"]


# Un frontend moderno se compila en archivos estáticos (HTML, JS, CSS) y la interactividad funciona porque el navegador 
# ejecuta el JavaScript generado en el build, que se encarga de manejar eventos, cambiar la interfaz y hacer peticiones 
# al backend.

# Nginx se usa cuando tú controlas el servidor o la infraestructura, no cuando usas plataformas como Vercel o Netlify
# porque estas cumplen las funcion de nginx en despliegue.