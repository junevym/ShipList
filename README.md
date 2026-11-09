# ShipList 🌱

Una lista de tareas en español para organizar el día, un paso a la vez. Proyecto inicial realizado con ayuda de IA para aprender los fundamentos de desarrollo web.

## Funciones

- Agregar tareas y marcarlas como hechas.
- Filtrar todas, pendientes o hechas.
- Eliminar una tarea o limpiar las completadas.
- Ver el progreso de la lista.
- Guardar automáticamente en el navegador con `localStorage`.
- Usar la página desde el celular o con el teclado.

## Probarlo

Descarga el proyecto y abre `index.html` en un navegador moderno. No requiere instalar dependencias ni crear una cuenta. Para un guardado más consistente entre sesiones, úsalo desde GitHub Pages; el comportamiento de `localStorage` al abrir archivos locales puede variar según el navegador.

Las tareas se guardan en ese navegador: no se sincronizan entre dispositivos y se pierden si borras los datos del sitio. En modo privado, el navegador puede eliminarlas al cerrar la sesión.

## Archivos para aprender

| Archivo | Qué hace |
| --- | --- |
| `index.html` | Define el contenido, el formulario y las secciones. |
| `styles.css` | Define colores, tamaños y la adaptación al celular. |
| `app.js` | Controla las tareas, los filtros y el guardado. |

## Subirlo a GitHub y publicarlo

1. En GitHub, crea un repositorio público llamado `ShipList`.
2. Selecciona **Add file → Upload files** y carga `index.html`, `styles.css`, `app.js`, `README.md` y `.gitignore` en la raíz del repositorio.
3. Guarda con **Commit changes**. Un mensaje posible es `Agrega primera versión de la lista de tareas`.
4. Abre **Settings → Pages**. En **Build and deployment**, selecciona **Deploy from a branch**.
5. Selecciona la rama `main` y la carpeta `/ (root)`; guarda.
6. Cuando GitHub muestre la dirección de la página, agrégala al campo **Website** de la sección **About** del repositorio.
7. En tu perfil, usa **Customize your pins** para fijar el proyecto.

Subir estos archivos a un repositorio propio crea un proyecto para tu portafolio; no es una contribución a un repositorio ajeno.

## Practica con tu primer cambio

En `index.html`, cambia la frase “No tienes que hacerlo todo hoy” por una frase tuya. Comprueba el resultado y guarda el cambio en GitHub. Después puedes probar otro color modificando `--green` en `styles.css`.

## Comprobación manual

- Agrega una tarea; recarga y comprueba que sigue ahí.
- Márcala como hecha y prueba los tres filtros.
- Elimínala y prueba “Limpiar hechas” con varias tareas completadas.
- Prueba una tarea con texto largo y caracteres como `<` y `>`.
- Reduce el ancho de la ventana y recorre los controles con Tab.

## Tecnologías

HTML, CSS y JavaScript puro. Sin bibliotecas ni servicios externos.
