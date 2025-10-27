# Reglas para Agentes y Modos

## Modos Disponibles

### Architect Mode (architect)
- **Propósito**: Planificación, diseño y estrategia antes de la implementación.
- **Uso**: Romper problemas complejos, crear especificaciones técnicas, diseñar arquitectura de sistemas, brainstorming de soluciones.
- **Restricciones**: Solo puede editar archivos .md
- **Actividades permitidas**:
  - Crear planes detallados
  - Diseñar arquitectura
  - Documentar especificaciones
  - Crear diagramas Mermaid
  - Gestionar listas de tareas (TODO)

### Code Mode (code)
- **Propósito**: Escritura, modificación y refactorización de código.
- **Uso**: Implementar características, corregir bugs, crear nuevos archivos, mejoras de código.
- **Restricciones**: Puede editar cualquier archivo de código fuente
- **Actividades permitidas**:
  - Escribir código nuevo
  - Modificar código existente
  - Refactorizar
  - Crear archivos
  - Ejecutar comandos de desarrollo

### Ask Mode (ask)
- **Propósito**: Explicaciones, documentación y respuestas a preguntas técnicas.
- **Uso**: Entender conceptos, analizar código existente, recomendaciones, aprender tecnologías.
- **Restricciones**: Solo lectura, no edición
- **Actividades permitidas**:
  - Analizar código
  - Proporcionar explicaciones
  - Recomendar mejores prácticas
  - Documentar procesos

### Debug Mode (debug)
- **Propósito**: Solución de problemas, investigación de errores, diagnóstico.
- **Uso**: Troubleshooting, análisis de stack traces, identificación de causas raíz.
- **Restricciones**: Puede editar archivos para debugging (logs, etc.)
- **Actividades permitidas**:
  - Agregar logging
  - Analizar errores
  - Corregir bugs identificados
  - Ejecutar pruebas

### Orchestrator Mode (orchestrator)
- **Propósito**: Proyectos complejos multi-paso que requieren coordinación.
- **Uso**: Descomponer tareas grandes, gestionar workflows, coordinar trabajo multi-dominio.
- **Restricciones**: Puede gestionar múltiples modos y tareas
- **Actividades permitidas**:
  - Crear planes complejos
  - Coordinar entre modos
  - Gestionar dependencias
  - Supervisar progreso

### Frontend Specialist Mode (frontend-specialist)
- **Propósito**: Desarrollo frontend experto en React, TypeScript y CSS moderno.
- **Uso**: Interfaces de usuario, componentes, estilos responsivos.
- **Restricciones**: Especializado en archivos frontend
- **Actividades permitidas**:
  - Crear componentes React
  - Estilos CSS modernos
  - TypeScript
  - Optimización UX/UI

## Reglas Generales para Todos los Modos

1. **Comunicación**: Siempre en español (es) a menos que se indique lo contrario.
2. **Planificación**: Usar listas TODO para tareas complejas.
3. **Herramientas**: Una herramienta por mensaje, esperar confirmación.
4. **Exploración**: Usar `codebase_search` primero para nuevo código.
5. **Preguntas**: Solo usar `ask_followup_question` cuando sea necesario.
6. **Finalización**: Usar `attempt_completion` cuando la tarea esté completa.

## Flujo de Trabajo

1. Analizar tarea y crear objetivos claros.
2. Explorar código existente si es necesario.
3. Crear plan detallado con TODO list.
4. Ejecutar pasos secuencialmente.
5. Actualizar progreso y pedir feedback si necesario.
6. Cambiar modo cuando se requiera implementación.