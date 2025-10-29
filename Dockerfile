FROM node:18-alpine

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de configuración
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar código fuente
COPY . .

# Crear directorio para uploads
RUN mkdir -p public/uploads

# Exponer puerto
EXPOSE 3000

# Ejecutar corrección de restricciones antes de iniciar
RUN echo "Ejecutando corrección de restricciones..."
RUN node fix-constraints.js

# Comando para ejecutar la aplicación
CMD ["npm", "start"]