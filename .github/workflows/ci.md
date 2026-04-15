# CI explicado

Este archivo deja la explicación pedagógica junto al workflow.

## Qué hace este CI
Valida automáticamente que no se hayan roto cosas básicas del proyecto:

- backend: `lint`, `build`, tests unitarios y tests de integración
- frontend: `lint` y `build`

## YAML del workflow
```yaml
# Un workflow es un proceso automatizado para indicar “cuando pase cierto evento, ejecuta estas tareas automáticamente”.
	# workflow = el proceso completo
	# job = una unidad grande dentro de ese proceso
	# step = un paso pequeño dentro de un job

#Integrar cambios al repo y validar automáticamente que no se rompieron cosas básicas (Continuous Integration).
name: CI

# Esta palabra indica los eventos que disparan el workflow
on:
  # Acá se puede especificar en que ramas se dispararia
  push:
    #branches: [main]
  pull_request:

#En un job Github actions:
  # 1. Crea una máquina virtual limpia (runner)
  # 2. Levanta lo que necesites (Node, Mongo, etc.)
  # 3. Ejecuta tu código (lint, build, tests)
  # 4. Verifica que todo funcione
  # 5. Destruye la máquina

jobs:
  # En este caso, el backend corre en una VM de ubuntu, no en docker, ya que se está 
  # verificando que el codigo esté correcto (CI)
  backend:
    runs-on: ubuntu-latest
    services:
      # Mongo corre en un contenedor porque necesitas un servicio externo 
      # (base de datos) y la forma más fácil y reproducible de levantarlo en CI es usando una imagen Docker.
      mongo:
        image: mongo:8.0
        ports:
          - 27017:27017
        # con los healthcheck, Docker sabe si Mongo está listo para usarse
        options: >-
          --health-cmd "mongosh --quiet --eval \"db.adminCommand('ping').ok\""
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    env:
      # variables con valores dummy para el entorno de pruebas de CI (no secrets)
      PORT: 3000
      MONGO_URI: mongodb://127.0.0.1:27017/autorent_test_ci
      JWT_SECRET: test-secret
      JWT_EXPIRES_IN: 1d
      ADMIN_EMAIL: admin@autorent.local
      ADMIN_PASSWORD: Admin123
    
    # define que todos los comandos run se ejecuten desde un directorio específico (como backend)
    defaults:
      run:
        # cada comando run: de este job se ejecutará dentro de la carpeta backend.
        working-directory: backend
    # step: una acción pequeña y específica que se ejecuta dentro de un job
    steps:
      # uses: usa una acción ya creada por alguien (GitHub o la comunidad)
      # run: ejecuta un comando de terminal

      # descarga tu repositorio dentro de la VM
      - name: Checkout
        uses: actions/checkout@v4

      #instala Node.js en la VM
      - name: Setup Node.js
        uses: actions/setup-node@v4
        # configuración del step
        with:
          node-version: 22
          # guarda el cache para no tener que instalar todas las dependencias desde cero
          cache: npm
          cache-dependency-path: backend/package-lock.json

      # Instala las dependencias usando exactamente lo que está en package-lock.json
      - name: Install dependencies
        run: npm ci

      # Espera a que mongo se levante y esté healthy, porque GitHub Actions no espera automáticamente
      - name: Wait for Mongo
        # Prueba la conexion con el bash de linux usando netcat
        run: |
          for i in {1..30}; do
            nc -z 127.0.0.1 27017 && exit 0
            sleep 1
          done
          echo "Mongo did not become ready in time"
          exit 1

      # Revisa todo el codigo con ESLint (sintaxis, malas prácticas, imports no usados, etc)
      - name: Lint backend
        run: npm run lint:check

      # Compila el backend (dist)
      - name: Build backend
        run: npm run build

      # Corre pruebas unitarias
      - name: Run backend unit tests
        # Busca los archivos terminados en .spec.ts dentro de src
        run: npm run test:unit

      # Corre pruebas de integracion 
      - name: Run backend integration tests
        # Busca los archivos terminados en test/jest-e2e.json
        run: npm run test:integration

  frontend:
    runs-on: ubuntu-latest
    defaults:
      # cada comando run: de este job se ejecutará dentro de la carpeta frontend.
      run:
        working-directory: frontend

    steps:
      # descarga el repositorio dentro de la VM
      - name: Checkout
        uses: actions/checkout@v4

      #instala Node.js en la VM
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Lint frontend
        run: npm run lint

      - name: Build frontend
        run: npm run build

```
