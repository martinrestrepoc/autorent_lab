## Qué hace este CD
Automatiza el despliegue cuando:

- termina correctamente el workflow `CI` sobre `main`
- o se ejecuta manualmente desde GitHub Actions

El flujo general es:

1. construir imágenes Docker
2. subirlas a Docker Hub
3. conectarse a la VM por SSH
4. actualizar el stack con `docker compose`
5. validar que el despliegue quedó sano

## YAML del workflow
```yaml
# Se deben configurar los secrets en github
# Los runners de Github para repos privados, se cobran a partir de ciertos minutos de ejecución
# CD solo se ejecuta si se hace un push o merge en la rama main, despues de que se ejecute CI

# este workflow se encarga del despliegue automático (Continuous Delivery / Continuous Deployment)
name: CD
# Esta palabra indica los eventos que disparan el workflow
on:
  # Este workflow puede dispararse cuando termina otro workflow
  workflow_run:
    # escucha al workflow llamado “CI” y se activa cuando ese workflow termina (completed)
    # completed no significa necesariamente que CI haya salido bien, solo significa que ya terminó, 
    # después, dentro del job, se filtra si terminó con éxito o no
    workflows: ["CI"]
    types:
      - completed
  # Permite ejecutar este workflow manualmente desde la interfaz de GitHub Actions, 
  # para poder ejecutarlo manualmente sin ejecutar CI
  workflow_dispatch:

# Sirve para evitar que haya varios workflows corriendo al mismo tiempo sobre el mismo entorno (se puede usar para jobs).
# Los workflows que se ejecuten, se agrupan y almacenan en una cola de ejecución (no pueden correr en paralelo)
concurrency:
  # agrupa ejecuciones del mismo tipo, con un nombre.
  group: cd-production
  # si llega un nuevo deploy mientras otro está corriendo, cancela el anterior y deja solo el más reciente
  cancel-in-progress: true

# Qué puede hacer este workflow dentro del repo
permissions:
  contents: read

# se guarda la ruta en una variable global del workflow para no escribirla repetidas veces
env:
  DEPLOY_PATH: /opt/autorent

jobs:
  # Este job no despliega, su responsabilidad es construir las imágenes Docker y subirlas a Docker Hub
  # Deja todo listo para que luego el servidor haga docker compose pull.
  build-and-push:
    # condicion de ejecución: “este job solo corre si esta condición es verdadera”
    # Tiene dos casos:
      # - si se ejecuta el workflow manualmente desde GitHub, solo se permite si se está en la rama main.
      # - si el CD fue disparado por otro workflow (en este caso, el CI), solo si el otro workflow terminó con 
      # success y el commit venía de la rama main.
    if: >-
      (github.event_name == 'workflow_dispatch' && github.ref == 'refs/heads/main') ||
      (github.event_name == 'workflow_run' &&
       github.event.workflow_run.conclusion == 'success' &&
       github.event.workflow_run.head_branch == 'main')
    # Se ejecuta el job en una VM limpia que crea Github (runner)
    # Cada job tiene su runner
    runs-on: ubuntu-latest
    # este job va a producir valores que otros jobs pueden usar
    outputs:
      # los tags para la imagen de Docker
      image_tag: ${{ steps.vars.outputs.image_tag }}
      git_sha_tag: ${{ steps.vars.outputs.git_sha_tag }}

    steps:

      # Checkout: descargar el código de tu repositorio dentro de la máquina donde corre el workflow

      - name: Checkout workflow_dispatch ref
        # lo descarga si el workflow fue ejecutado manualmente
        if: github.event_name == 'workflow_dispatch'
        uses: actions/checkout@v4

      - name: Checkout workflow_run ref
        # lo descarga cuando el CD fue disparado automáticamente por el CI
        if: github.event_name == 'workflow_run'
        uses: actions/checkout@v4
        # descarga exactamente el commit que disparó el CI (No solo la rama, sino el SHA exacto)
        with:
          ref: ${{ github.event.workflow_run.head_sha }}
        
        # Se crean los tags de la imagen de Docker (la imagen queda con 2 tags)
        # latest: apunta a la ultima imagen subida
        # sha: versión específica de un commit (los primeros 7 caracteres del sha del commit)
      - name: Compute image tags
        # permite que otros steps o jobs accedan a lo que este step genera
        id: vars
        # Guarda las variables en un archivo temporal, lee el archivo al final del step y convierte esas lineas en outputs.
        # set -euo pipefail (configuración de bash que hace que el script sea estricto y seguro)
        run: |
          set -euo pipefail

          if [ "${{ github.event_name }}" = "workflow_run" ]; then
            SOURCE_SHA="${{ github.event.workflow_run.head_sha }}"
          else
            SOURCE_SHA="${{ github.sha }}"
          fi

          echo "image_tag=latest" >> "$GITHUB_OUTPUT"
          echo "git_sha_tag=${SOURCE_SHA::7}" >> "$GITHUB_OUTPUT"

      # Instala y configura Docker Buildx dentro del runner de GitHub.
      # Buildx es una versión más avanzada de docker build que permite:
        # construir imágenes multi-arquitectura
        # usar cache de builds
        # integrarse mejor con GitHub Actions (crea builders temporales y no depende de lo que haya en la maquina)
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      # Autentica el runner en Docker Hub, para que pueda subir imagenes con mi namespace.
      # Se usa un access token y no la contraseña porque sirve para un uso específico 
      # en caso de que se filtre, ademas es más seguro y controlable.
      - name: Log in to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      # Define nombre y tags de la imagen.
      - name: Docker metadata for backend
        # permite que otros steps o jobs accedan a lo que este step genera
        id: backend-meta
        uses: docker/metadata-action@v5
        with:
          images: docker.io/${{ secrets.DOCKERHUB_USERNAME }}/autorent-backend
          tags: |
            type=raw,value=latest
            type=raw,value=${{ steps.vars.outputs.git_sha_tag }}

      # Define nombre y tags de la imagen.
      - name: Docker metadata for frontend
        # permite que otros steps o jobs accedan a lo que este step genera
        id: frontend-meta
        uses: docker/metadata-action@v5
        with:
          images: docker.io/${{ secrets.DOCKERHUB_USERNAME }}/autorent-frontend
          tags: |
            type=raw,value=latest
            type=raw,value=${{ steps.vars.outputs.git_sha_tag }}

      # Construye y sube la imagen a Dockerhub con sus respectivos tags
      - name: Build and push backend image
        uses: docker/build-push-action@v6
        with:
          context: ./backend
          file: ./backend/Dockerfile
          push: true
          # Usa el output del step backend-meta
          tags: ${{ steps.backend-meta.outputs.tags }}
          # Los labels son metadatos internos de la imagen (origen del repo, commit, versión, descripción)
          labels: ${{ steps.backend-meta.outputs.labels }}
          # activa cache usando GitHub Actions, para reutilizar capas de builds anteriores y acelerar builds futuros
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Build and push frontend image
        uses: docker/build-push-action@v6
        with:
          context: ./frontend
          file: ./frontend/Dockerfile
          push: true
          tags: ${{ steps.frontend-meta.outputs.tags }}
          labels: ${{ steps.frontend-meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # Este job se conecta a la VM, copia los archivos necesarios, corre docker compose pull de las imagenes subidas
  # en el job anterior, corre docker compose up -d y valida que el despliegue quedó bien.
  deploy:
    # No se puede correr hasta que termine build-and-push
    needs: build-and-push
    # En este job, el runner se conecta a la VM por SSH y hace el deploy ahí
    runs-on: ubuntu-latest
    # Esto asocia este job con el environment llamado production, que creamos en GitHub.
    # Sirve para reglas de protección, secrets especificos por environment y un historial de deploys.
    environment: production

    steps:
      
      # Descarga el código si fue ejecutado manualmente o si fue disparado por el CI.

      - name: Checkout workflow_dispatch ref
        if: github.event_name == 'workflow_dispatch'
        uses: actions/checkout@v4

      - name: Checkout workflow_run ref
        if: github.event_name == 'workflow_run'
        uses: actions/checkout@v4
        with:
          ref: ${{ github.event.workflow_run.head_sha }}

      # Un SSH agent es un proceso que guarda temporalmente claves privadas en memoria para poder usar ssh y scp 
      # en el runner y acceder a la VM.
      - name: Start SSH agent
        uses: webfactory/ssh-agent@v0.9.0
        with:
          ssh-private-key: ${{ secrets.SSH_PRIVATE_KEY }}

      # consulta la clave pública del servidor con ssh-keyscan y la guarda en known_hosts, así el runner ya “confía” 
      # en ese host y no pide confirmación interactiva.

      # SSH_HOST = la dirección de tu servidor
      # SSH_PORT = el puerto donde escucha el servicio SSH
      - name: Add deploy host to known_hosts
        run: |
          mkdir -p ~/.ssh
          echo "Scanning host ${{ secrets.SSH_HOST }} on port ${{ secrets.SSH_PORT }}"
          ssh-keyscan -v -p "${{ secrets.SSH_PORT }}" -H "${{ secrets.SSH_HOST }}" >> ~/.ssh/known_hosts

      # Se asegura de que exista la carpeta de despliegue: /opt/autorent
      - name: Ensure deploy directory exists
        run: |
          ssh -p "${{ secrets.SSH_PORT }}" "${{ secrets.SSH_USER }}@${{ secrets.SSH_HOST }}" \
            "mkdir -p '${{ env.DEPLOY_PATH }}'"

      # scp: secure copy
      # Se copia el compose.prod.yml de el runner a la VM
      - name: Upload production compose file
        run: |
          scp -P "${{ secrets.SSH_PORT }}" compose.prod.yml \
            "${{ secrets.SSH_USER }}@${{ secrets.SSH_HOST }}:${{ env.DEPLOY_PATH }}/compose.prod.yml"

      - name: Deploy with Docker Compose
        # Estas variables se ponen en env: para que existan en el runner, convirtiendolas en variables del shell
        # y luego poder pasarlas a la VM
        env:
          DOCKERHUB_USERNAME: ${{ secrets.DOCKERHUB_USERNAME }}
          DOCKERHUB_TOKEN: ${{ secrets.DOCKERHUB_TOKEN }}
          # needs contiene el contexto del job build-and-push
          IMAGE_TAG: ${{ needs.build-and-push.outputs.image_tag }}

        # este step ejecuta el deploy real en la VM usando SSH
        # se envían variables al servidor:
          # DOCKERHUB_USERNAME
          # DOCKERHUB_TOKEN
          # IMAGE_TAG
          # DEPLOY_PATH

        # dentro de la VM:

        # 1. entra al directorio de despliegue
        # 2. valida que exista el .env
        # 3. hace login en Docker Hub
        # 4. exporta variables usadas por docker compose
        # 5. descarga imágenes (docker compose pull)
        # 6. levanta/actualiza contenedores (up -d)
        # 7. elimina imágenes no usadas (prune)
        # 8. muestra el estado de los servicios

        #'EOF' (con comillas):
          # evita que el runner expanda variables
          # hace que las variables se evalúen en la VM
        
        # 'bash -se' <<'EOF': todo lo que venga después se lo voy a pasar como entrada a bash en la VM 
        # export convierte esas variables en variables de entorno, para poder ser usada en el compose (proceso hijo).
        # --remove-orphans elimina contenedores que ya no estan en el compose.
        run: |
          ssh -p "${{ secrets.SSH_PORT }}" "${{ secrets.SSH_USER }}@${{ secrets.SSH_HOST }}" \
            DOCKERHUB_USERNAME="${DOCKERHUB_USERNAME}" \
            DOCKERHUB_TOKEN="${DOCKERHUB_TOKEN}" \
            IMAGE_TAG="${IMAGE_TAG}" \
            DEPLOY_PATH="${{ env.DEPLOY_PATH }}" \
            'bash -se' <<'EOF'
          set -euo pipefail
          cd "$DEPLOY_PATH"

          if [ ! -f .env ]; then
            echo "Missing production .env in $DEPLOY_PATH"
            exit 1
          fi

          echo "$DOCKERHUB_TOKEN" | docker login -u "$DOCKERHUB_USERNAME" --password-stdin

          export DOCKERHUB_NAMESPACE="$DOCKERHUB_USERNAME"
          export IMAGE_TAG="$IMAGE_TAG"

          docker compose -f compose.prod.yml pull
          docker compose -f compose.prod.yml up -d --remove-orphans
          docker image prune -f
          docker compose -f compose.prod.yml ps
          EOF

      # Este step se conecta a la VM, revisa que Mongo responda y revisar que el backend/frontend respondan como se espera
      - name: Validate deployed services
      # test comprueba que mongo responda correctamente
      # Se usa curl para probar el endpoint del login, verificando el comportamiento de la aplicacion, con un error 401
      # Si test falla, devuelve un falso, que con el -e, se detiene el script, por ende, falla el step y el workflow.
        run: |
          ssh -p "${{ secrets.SSH_PORT }}" "${{ secrets.SSH_USER }}@${{ secrets.SSH_HOST }}" \
            DEPLOY_PATH="${{ env.DEPLOY_PATH }}" \
            'bash -se' <<'EOF'
          set -euo pipefail
          cd "$DEPLOY_PATH"

          test "$(docker compose -f compose.prod.yml exec -T mongo mongosh --quiet --eval "db.adminCommand('ping').ok")" = "1"

          HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' \
            -X POST http://127.0.0.1:8080/api/auth/login \
            -H 'Content-Type: application/json' \
            -d '{"email":"invalid@example.com","password":"invalid-password"}')

          test "$HTTP_CODE" = "401"
          EOF


# branch protection:
  # protege una rama (ej: main)

# sirve para:
  # evitar pushes directos
  # forzar uso de pull requests
  # asegurar que CI pase antes del merge
  # mantener estabilidad en producción

# permite configurar:
  # requerir PR
  # requerir checks (CI)
  # requerir aprobaciones
  # bloquear force push
```

