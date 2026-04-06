# CD con Docker Hub y VM propia

## Qué hace el workflow
El workflow de CD:

1. Espera a que el workflow `CI` termine bien en `main`
2. Construye las imágenes de `backend` y `frontend`
3. Publica ambas imágenes en Docker Hub
4. Se conecta por SSH a la VM
5. Copia `compose.prod.yml`
6. Ejecuta `docker compose pull` y `docker compose up -d`
7. Valida Mongo y el endpoint `/api/auth/login` a través del frontend

También puede ejecutarse manualmente con `workflow_dispatch`, pero solo debe usarse desde `main`.

## Secrets requeridos en GitHub
Configura estos secrets en el repositorio:

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`
- `SSH_HOST`
- `SSH_PORT`
- `SSH_USER`
- `SSH_PRIVATE_KEY`

## Preparación obligatoria de la VM
En la VM debes tener:

- Docker Engine instalado
- Docker Compose plugin instalado
- un directorio de despliegue en `/opt/autorent_lab`
- un archivo `/opt/autorent_lab/.env` con las variables de producción

Variables mínimas esperadas en `/opt/autorent_lab/.env`:

```env
PORT=3000
MONGO_URI=mongodb://mongo:27017/autorent
JWT_SECRET=change-me
JWT_EXPIRES_IN=7d
ADMIN_EMAIL=admin@autorent.local
ADMIN_PASSWORD=change-me-too
```

## Primer despliegue manual recomendado
Antes de usar el workflow, conviene probar una vez a mano en la VM:

```bash
scp compose.prod.yml <usuario>@<ip_vm>:/opt/autorent_lab/compose.prod.yml
ssh <usuario>@<ip_vm>
cd /opt/autorent_lab
export DOCKERHUB_NAMESPACE=<tu_usuario_dockerhub>
export IMAGE_TAG=latest
docker compose -f compose.prod.yml pull
docker compose -f compose.prod.yml up -d
docker compose -f compose.prod.yml ps
```

## Resultado esperado
Después de un deploy correcto:

- el frontend responde en `http://<IP_DE_LA_VM>:8080`
- el backend queda accesible detrás del proxy de Nginx en `/api`
- Mongo no queda expuesto públicamente
- los datos persisten en los volúmenes `mongo_data` y `backend_uploads`
