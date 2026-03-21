openapi: 3.0.3
info:
  title: Autorent API
  version: 1.0.0
  description: >
    Contrato OpenAPI para frontend. Incluye autenticación, vehículos y documentos
    (subida/listado/consulta/descarga).
servers:
  - url: http://localhost:3000
    description: Local

tags:
  - name: Auth
  - name: Vehiculos
  - name: Documentos

paths:
  /auth/login:
    post:
      tags: [Auth]
      summary: Iniciar sesión
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/LoginRequest'
      responses:
        '200':
          description: Login exitoso
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/LoginResponse'
        '400':
          description: Error de validación
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Credenciales inválidas
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /auth/me:
    get:
      tags: [Auth]
      summary: Obtener usuario autenticado
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Usuario autenticado
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MeResponse'
        '401':
          description: Token inválido o ausente
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /vehiculos:
    post:
      tags: [Vehiculos]
      summary: Crear vehículo
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateVehicleRequest'
      responses:
        '201':
          description: Vehículo creado
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/VehicleMutationResponse'
        '400':
          description: Validación o placa duplicada
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
    get:
      tags: [Vehiculos]
      summary: Listar vehículos
      responses:
        '200':
          description: Lista de vehículos
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Vehicle'

  /vehiculos/{id}:
    get:
      tags: [Vehiculos]
      summary: Obtener vehículo por ID
      parameters:
        - $ref: '#/components/parameters/VehicleId'
      responses:
        '200':
          description: Vehículo encontrado
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Vehicle'
        '404':
          description: Vehículo no encontrado
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
    patch:
      tags: [Vehiculos]
      summary: Actualizar vehículo
      parameters:
        - $ref: '#/components/parameters/VehicleId'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateVehicleRequest'
      responses:
        '200':
          description: Vehículo actualizado
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/VehicleMutationResponse'
        '400':
          description: Error de validación
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: Vehículo no encontrado
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /vehiculos/{id}/documentos:
    post:
      tags: [Documentos]
      summary: Subir documento a vehículo
      parameters:
        - $ref: '#/components/parameters/VehicleId'
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              $ref: '#/components/schemas/UploadDocumentRequest'
      responses:
        '201':
          description: Documento cargado
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UploadDocumentResponse'
        '400':
          description: Formato no permitido o validación de campos
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: Vehículo no encontrado
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
    get:
      tags: [Documentos]
      summary: Listar documentos de un vehículo
      parameters:
        - $ref: '#/components/parameters/VehicleId'
      responses:
        '200':
          description: Lista de documentos
          content:
            application/json:
              schema:
                type: object
                properties:
                  documents:
                    type: array
                    items:
                      $ref: '#/components/schemas/VehicleDocument'
        '404':
          description: Vehículo no encontrado
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /vehiculos/{id}/documentos/{docId}:
    get:
      tags: [Documentos]
      summary: Obtener metadata de documento
      parameters:
        - $ref: '#/components/parameters/VehicleId'
        - $ref: '#/components/parameters/DocumentId'
      responses:
        '200':
          description: Documento encontrado
          content:
            application/json:
              schema:
                type: object
                properties:
                  document:
                    $ref: '#/components/schemas/VehicleDocument'
        '404':
          description: Vehículo o documento no encontrado
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /vehiculos/{id}/documentos/{docId}/descargar:
    get:
      tags: [Documentos]
      summary: Descargar archivo del documento
      parameters:
        - $ref: '#/components/parameters/VehicleId'
        - $ref: '#/components/parameters/DocumentId'
      responses:
        '200':
          description: Archivo binario
          content:
            application/octet-stream:
              schema:
                type: string
                format: binary
        '404':
          description: Vehículo, documento o archivo no encontrado
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /vehicles:
    post:
      tags: [Vehiculos]
      summary: Alias de /vehiculos - Crear vehículo
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateVehicleRequest'
      responses:
        '201':
          description: Vehículo creado
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/VehicleMutationResponse'
    get:
      tags: [Vehiculos]
      summary: Alias de /vehiculos - Listar vehículos
      responses:
        '200':
          description: Lista de vehículos
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Vehicle'

  /vehicles/{id}:
    get:
      tags: [Vehiculos]
      summary: Alias de /vehiculos/{id} - Obtener vehículo
      parameters:
        - $ref: '#/components/parameters/VehicleId'
      responses:
        '200':
          description: Vehículo encontrado
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Vehicle'
    patch:
      tags: [Vehiculos]
      summary: Alias de /vehiculos/{id} - Actualizar vehículo
      parameters:
        - $ref: '#/components/parameters/VehicleId'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateVehicleRequest'
      responses:
        '200':
          description: Vehículo actualizado
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/VehicleMutationResponse'

  /vehicles/{id}/documentos:
    post:
      tags: [Documentos]
      summary: Alias de /vehiculos/{id}/documentos - Subir documento
      parameters:
        - $ref: '#/components/parameters/VehicleId'
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              $ref: '#/components/schemas/UploadDocumentRequest'
      responses:
        '201':
          description: Documento cargado
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UploadDocumentResponse'
    get:
      tags: [Documentos]
      summary: Alias de /vehiculos/{id}/documentos - Listar documentos
      parameters:
        - $ref: '#/components/parameters/VehicleId'
      responses:
        '200':
          description: Lista de documentos
          content:
            application/json:
              schema:
                type: object
                properties:
                  documents:
                    type: array
                    items:
                      $ref: '#/components/schemas/VehicleDocument'

  /vehicles/{id}/documentos/{docId}:
    get:
      tags: [Documentos]
      summary: Alias de /vehiculos/{id}/documentos/{docId} - Obtener metadata
      parameters:
        - $ref: '#/components/parameters/VehicleId'
        - $ref: '#/components/parameters/DocumentId'
      responses:
        '200':
          description: Documento encontrado
          content:
            application/json:
              schema:
                type: object
                properties:
                  document:
                    $ref: '#/components/schemas/VehicleDocument'

  /vehicles/{id}/documentos/{docId}/descargar:
    get:
      tags: [Documentos]
      summary: Alias de /vehiculos/{id}/documentos/{docId}/descargar - Descargar archivo
      parameters:
        - $ref: '#/components/parameters/VehicleId'
        - $ref: '#/components/parameters/DocumentId'
      responses:
        '200':
          description: Archivo binario
          content:
            application/octet-stream:
              schema:
                type: string
                format: binary

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  parameters:
    VehicleId:
      name: id
      in: path
      required: true
      schema:
        type: string
      example: 65f0c1f9e8c4a1b2c3d4e5f6
    DocumentId:
      name: docId
      in: path
      required: true
      schema:
        type: string
      example: 65f0c2a9e8c4a1b2c3d4e600

  schemas:
    LoginRequest:
      type: object
      required: [email, password]
      properties:
        email:
          type: string
          format: email
          example: admin@autorent.local
        password:
          type: string
          minLength: 6
          example: Admin123

    LoginResponse:
      type: object
      properties:
        access_token:
          type: string
          example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxx.yyy
        user:
          $ref: '#/components/schemas/MeResponse'

    MeResponse:
      type: object
      properties:
        id:
          type: string
          example: 65f0c1f9e8c4a1b2c3d4e5f6
        email:
          type: string
          format: email
          example: admin@autorent.local
        role:
          type: string
          example: ADMIN

    CreateVehicleRequest:
      type: object
      required: [plate, brand, model, year]
      properties:
        plate:
          type: string
          description: Formato ABC123
          pattern: '^[A-Z]{3}[0-9]{3}$'
          minLength: 6
          maxLength: 6
          example: ABC123
        brand:
          type: string
          example: Mazda
        model:
          type: string
          example: 3
        year:
          type: integer
          minimum: 1950
          maximum: 2100
          example: 2021

    UpdateVehicleRequest:
      type: object
      properties:
        plate:
          type: string
          pattern: '^[A-Z]{3}[0-9]{3}$'
          minLength: 6
          maxLength: 6
          example: DEF456
        brand:
          type: string
          example: Toyota
        model:
          type: string
          example: Corolla
        year:
          type: integer
          minimum: 1950
          maximum: 2100
          example: 2022

    Vehicle:
      type: object
      properties:
        _id:
          type: string
          example: 65f0c1f9e8c4a1b2c3d4e5f6
        plate:
          type: string
          example: ABC123
        brand:
          type: string
          example: Mazda
        model:
          type: string
          example: 3
        year:
          type: integer
          example: 2021
        status:
          type: string
          example: AVAILABLE
        documents:
          type: array
          items:
            $ref: '#/components/schemas/VehicleDocument'
        createdAt:
          type: string
          format: date-time
          example: '2026-02-16T00:00:00.000Z'
        updatedAt:
          type: string
          format: date-time
          example: '2026-02-16T00:00:00.000Z'

    VehicleMutationResponse:
      type: object
      properties:
        message:
          type: string
          example: Vehículo creado con éxito
        vehicle:
          $ref: '#/components/schemas/Vehicle'

    UploadDocumentRequest:
      type: object
      required: [type, expiresAt, file]
      properties:
        type:
          type: string
          enum: [SOAT, TARJETA_PROPIEDAD, TECNOMECANICA]
          example: SOAT
        expiresAt:
          type: string
          format: date
          example: '2026-12-31'
        file:
          type: string
          format: binary

    VehicleDocument:
      type: object
      properties:
        id:
          type: string
          example: 65f0c2a9e8c4a1b2c3d4e600
        type:
          type: string
          enum: [SOAT, TARJETA_PROPIEDAD, TECNOMECANICA]
          example: SOAT
        originalName:
          type: string
          example: soat.pdf
        mimeType:
          type: string
          example: application/pdf
        size:
          type: integer
          example: 123456
        storagePath:
          type: string
          example: /path/to/uploads/vehicles/65f0c1f9e8c4a1b2c3d4e5f6/1739712457012-1234.pdf
        expiresAt:
          type: string
          format: date-time
          example: '2026-12-31T00:00:00.000Z'
        uploadedAt:
          type: string
          format: date-time
          example: '2026-02-16T00:00:00.000Z'
        status:
          type: string
          enum: [VIGENTE, VENCIDO]
          example: VIGENTE

    UploadDocumentResponse:
      type: object
      properties:
        message:
          type: string
          example: Documento cargado con éxito
        document:
          $ref: '#/components/schemas/VehicleDocument'

    ErrorResponse:
      type: object
      properties:
        statusCode:
          type: integer
          example: 400
        message:
          oneOf:
            - type: string
              example: Formato no permitido
            - type: array
              items:
                type: string
              example: ["year must not be less than 1950"]
        error:
          type: string
          example: Bad Request
